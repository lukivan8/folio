import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import { CarbonTaskItem } from "./CarbonTaskItem";
import "./checklist.css";

/** Shared by the document editor and its Storybook fixtures. */
export function textExtensions() {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      },
    }),
    TableKit,
    TaskList,
    CarbonTaskItem.configure({
      nested: true,
      HTMLAttributes: { class: "folio-task-item", "data-type": "taskItem" },
    }),
  ];
}
