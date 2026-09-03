import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  return (
    roles?.some((r) => r.role === "admin" || r.role === "super_admin") ?? false
  );
}

// GET /api/admin/quiz?lesson_id=... — load full quiz (config + questions + options)
export async function GET(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lesson_id");
  if (!lessonId) {
    return NextResponse.json(
      { error: "lesson_id required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Get or create config
  let { data: config } = await admin
    .from("quiz_config")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (!config) {
    const { data: newConfig } = await admin
      .from("quiz_config")
      .insert({ lesson_id: lessonId })
      .select()
      .single();
    config = newConfig;
  }

  // Get questions with options
  const { data: questions } = await admin
    .from("quiz_questions")
    .select("*, quiz_options(*)")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true });

  // Sort options by position within each question
  const sortedQuestions = (questions ?? []).map((q) => ({
    ...q,
    quiz_options: (q.quiz_options ?? []).sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position
    ),
  }));

  return NextResponse.json({ config, questions: sortedQuestions });
}

// PUT /api/admin/quiz — save/update quiz config
export async function PUT(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    lesson_id,
    pass_mark,
    time_limit_seconds,
    randomize,
    max_attempts,
    intro_title,
    intro_message,
    end_title,
    end_message,
  } = body;

  if (!lesson_id) {
    return NextResponse.json(
      { error: "lesson_id required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Upsert config (lesson_id is unique)
  const { data, error } = await admin
    .from("quiz_config")
    .upsert(
      {
        lesson_id,
        pass_mark: pass_mark ?? 80,
        time_limit_seconds: time_limit_seconds || null,
        randomize: randomize ?? true,
        max_attempts: max_attempts || null,
        intro_title: intro_title || null,
        intro_message: intro_message || null,
        end_title: end_title || null,
        end_message: end_message || null,
      },
      { onConflict: "lesson_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ config: data });
}

// POST /api/admin/quiz — create or update a question (with its options)
export async function POST(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    id,
    lesson_id,
    position,
    question_text,
    question_type,
    media_url,
    media_type,
    points,
    explanation,
    options,
  } = body;

  if (!lesson_id) {
    return NextResponse.json(
      { error: "lesson_id required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  let questionId = id;

  if (id) {
    // Update existing question
    const { error } = await admin
      .from("quiz_questions")
      .update({
        question_text: question_text ?? "",
        question_type: question_type ?? "single_choice",
        media_url: media_url || null,
        media_type: media_type || null,
        points: points ?? 1,
        position: position ?? 0,
        explanation: explanation || null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Create new question
    const { data: newQ, error } = await admin
      .from("quiz_questions")
      .insert({
        lesson_id,
        question_text: question_text ?? "",
        question_type: question_type ?? "single_choice",
        media_url: media_url || null,
        media_type: media_type || null,
        points: points ?? 1,
        position: position ?? 0,
        explanation: explanation || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    questionId = newQ.id;
  }

  // Replace options: delete existing, insert new set
  if (Array.isArray(options)) {
    await admin.from("quiz_options").delete().eq("question_id", questionId);

    if (options.length > 0) {
      const rows = options.map(
        (
          opt: {
            content: string;
            is_correct: boolean;
            image_url?: string | null;
          },
          idx: number
        ) => ({
          question_id: questionId,
          position: idx,
          content: opt.content ?? "",
          is_correct: opt.is_correct ?? false,
          image_url: opt.image_url || null,
        })
      );

      const { error: optErr } = await admin
        .from("quiz_options")
        .insert(rows);

      if (optErr) {
        return NextResponse.json({ error: optErr.message }, { status: 500 });
      }
    }
  }

  // Return the full question with options
  const { data: full } = await admin
    .from("quiz_questions")
    .select("*, quiz_options(*)")
    .eq("id", questionId)
    .single();

  return NextResponse.json({ question: full });
}

// DELETE /api/admin/quiz — delete a question
export async function DELETE(request: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("question_id");

  if (!questionId) {
    return NextResponse.json(
      { error: "question_id required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
