"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";

import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Code,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function RichTextEditor({
  value,
  onChange,
}: RichTextEditorProps) {
  const [fontFamily, setFontFamily] =
    useState("Arial");

  const [textColor, setTextColor] =
    useState("#000000");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,

      TextAlign.configure({
        types: [
          "heading",
          "paragraph",
        ],
      }),

      Link.configure({
        openOnClick: false,
        autolink: true,
      }),

      Highlight.configure({
        multicolor: true,
      }),
    ],

    content: value || "<p></p>",

    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    if (value !== editor.getHTML()) {
      editor.commands.setContent(
        value || "<p></p>"
      );
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white p-6 text-sm text-slate-400">
        Loading editor...
      </div>
    );
  }

  function setLink() {
  if (!editor) return;

  const previousUrl =
    editor.getAttributes("link").href;

  const url = window.prompt(
    "Enter URL",
    previousUrl || ""
  );

  if (url === null) return;

  if (url === "") {
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .unsetLink()
      .run();

    return;
  }

  editor
    .chain()
    .focus()
    .extendMarkRange("link")
    .setLink({
      href: url,
    })
    .run();
}

function changeFontFamily(value: string) {
  if (!editor) return;

  setFontFamily(value);

  editor
    .chain()
    .focus()
    .setFontFamily(value)
    .run();
}

function changeTextColor(
  color: string
) {
  if (!editor) return;

  setTextColor(color);

  editor
    .chain()
    .focus()
    .setColor(color)
    .run();
}

  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40";

  const activeButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-md bg-slate-200 text-slate-900";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">

        {/* Undo */}
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().undo().run()
          }
          disabled={!editor.can().undo()}
          className={buttonClass}
          title="Undo"
        >
          <Undo2 size={17} />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().redo().run()
          }
          disabled={!editor.can().redo()}
          className={buttonClass}
          title="Redo"
        >
          <Redo2 size={17} />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        {/* Font family */}
        <select
          value={fontFamily}
          onChange={(event) =>
            changeFontFamily(
              event.target.value
            )
          }
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none"
        >
          <option value="Arial">
            Arial
          </option>

          <option value="Georgia">
            Georgia
          </option>

          <option value="Times New Roman">
            Times New Roman
          </option>

          <option value="Verdana">
            Verdana
          </option>

          <option value="Tahoma">
            Tahoma
          </option>

          <option value="Courier New">
            Courier New
          </option>
        </select>

        {/* Text style */}
        <select
          defaultValue="paragraph"
          onChange={(event) => {
            const style =
              event.target.value;

            if (
              style === "paragraph"
            ) {
              editor
                .chain()
                .focus()
                .setParagraph()
                .run();
            }

            if (style === "h1") {
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 1,
                })
                .run();
            }

            if (style === "h2") {
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 2,
                })
                .run();
            }

            if (style === "h3") {
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 3,
                })
                .run();
            }

            if (style === "h4") {
              editor
                .chain()
                .focus()
                .toggleHeading({
                  level: 4,
                })
                .run();
            }
          }}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none"
        >
          <option value="paragraph">
            Normal
          </option>

          <option value="h1">
            Heading 1
          </option>

          <option value="h2">
            Heading 2
          </option>

          <option value="h3">
            Heading 3
          </option>

          <option value="h4">
            Heading 4
          </option>
        </select>

        {/* Font colour */}
        <div className="flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-2">
          <input
            type="color"
            value={textColor}
            onChange={(event) =>
              changeTextColor(
                event.target.value
              )
            }
            className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
            title="Text colour"
          />

          <span className="text-xs font-medium text-slate-500">
            A
          </span>
        </div>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        {/* Bold */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
          className={
            editor.isActive("bold")
              ? activeButtonClass
              : buttonClass
          }
          title="Bold"
        >
          <Bold size={17} />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
          className={
            editor.isActive("italic")
              ? activeButtonClass
              : buttonClass
          }
          title="Italic"
        >
          <Italic size={17} />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleUnderline()
              .run()
          }
          className={
            editor.isActive("underline")
              ? activeButtonClass
              : buttonClass
          }
          title="Underline"
        >
          <UnderlineIcon size={17} />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleStrike()
              .run()
          }
          className={
            editor.isActive("strike")
              ? activeButtonClass
              : buttonClass
          }
          title="Strikethrough"
        >
          <Strikethrough size={17} />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        {/* Bullet list */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
          className={
            editor.isActive("bulletList")
              ? activeButtonClass
              : buttonClass
          }
          title="Bullet list"
        >
          <List size={17} />
        </button>

        {/* Numbered list */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
          className={
            editor.isActive("orderedList")
              ? activeButtonClass
              : buttonClass
          }
          title="Numbered list"
        >
          <ListOrdered size={17} />
        </button>

        {/* Quote */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBlockquote()
              .run()
          }
          className={
            editor.isActive("blockquote")
              ? activeButtonClass
              : buttonClass
          }
          title="Quote"
        >
          <Quote size={17} />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign("left")
              .run()
          }
          className={
            editor.isActive({
              textAlign: "left",
            })
              ? activeButtonClass
              : buttonClass
          }
          title="Align left"
        >
          <AlignLeft size={17} />
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign("center")
              .run()
          }
          className={
            editor.isActive({
              textAlign: "center",
            })
              ? activeButtonClass
              : buttonClass
          }
          title="Align centre"
        >
          <AlignCenter size={17} />
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign("right")
              .run()
          }
          className={
            editor.isActive({
              textAlign: "right",
            })
              ? activeButtonClass
              : buttonClass
          }
          title="Align right"
        >
          <AlignRight size={17} />
        </button>

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .setTextAlign("justify")
              .run()
          }
          className={
            editor.isActive({
              textAlign: "justify",
            })
              ? activeButtonClass
              : buttonClass
          }
          title="Justify"
        >
          <AlignJustify size={17} />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        {/* Add link */}
        <button
          type="button"
          onClick={setLink}
          className={
            editor.isActive("link")
              ? activeButtonClass
              : buttonClass
          }
          title="Add link"
        >
          <LinkIcon size={17} />
        </button>

        {/* Remove link */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetLink()
              .run()
          }
          className={buttonClass}
          title="Remove link"
        >
          <Unlink size={17} />
        </button>

        {/* Code block */}
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleCodeBlock()
              .run()
          }
          className={
            editor.isActive("codeBlock")
              ? activeButtonClass
              : buttonClass
          }
          title="Code block"
        >
          <Code size={17} />
        </button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="min-h-[300px] px-6 py-5 text-slate-800"
      />

      <style jsx global>{`
        .ProseMirror {
          min-height: 260px;
          outline: none;
        }

        .ProseMirror p {
          margin: 0 0 1rem;
        }

        .ProseMirror h1 {
          margin: 1.5rem 0 1rem;
          font-size: 2rem;
          font-weight: 700;
        }

        .ProseMirror h2 {
          margin: 1.25rem 0 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .ProseMirror h3 {
          margin: 1rem 0 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .ProseMirror ul {
          margin: 1rem 0;
          list-style-type: disc;
          padding-left: 1.5rem;
        }

        .ProseMirror ol {
          margin: 1rem 0;
          list-style-type: decimal;
          padding-left: 1.5rem;
        }

        .ProseMirror blockquote {
          margin: 1rem 0;
          border-left: 3px solid #cbd5e1;
          padding-left: 1rem;
          color: #64748b;
        }

        .ProseMirror a {
          cursor: pointer;
          color: #2563eb;
          text-decoration: underline;
        }

        .ProseMirror pre {
          overflow-x: auto;
          border-radius: 0.5rem;
          background: #0f172a;
          padding: 1rem;
          color: white;
        }
      `}</style>
    </div>
  );
}