import TaskItem from "@tiptap/extension-task-item";
import { createRoot } from "react-dom/client";
import { Checkbox } from "@carbon/react";
/** Carbon checkbox + Tiptap-owned contentDOM; the portable taskItem schema is unchanged. */
export const CarbonTaskItem = TaskItem.extend({
  addNodeView() {
    return ({ node: initial, editor, getPos }) => {
      let node = initial;
      const dom = document.createElement("li");
      dom.className = "folio-task-item";
      dom.dataset.type = "taskItem";
      const control = document.createElement("div");
      control.className = "task-checkbox";
      control.contentEditable = "false";
      const contentDOM = document.createElement("div");
      contentDOM.dataset.taskContent = "";
      dom.append(control, contentDOM);
      const root = createRoot(control),
        id = "task-" + crypto.randomUUID();
      const render = () => {
        dom.dataset.checked = String(node.attrs.checked);
        root.render(
          <Checkbox
            id={id}
            hideLabel
            labelText={"Task item checkbox for " + node.textContent}
            checked={!!node.attrs.checked}
            disabled={!editor.isEditable}
            onChange={(_event, { checked }) => {
              const pos = getPos();
              if (typeof pos !== "number" || !editor.isEditable) return;
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  checked,
                }),
              );
            }}
          />,
        );
      };
      render();
      return {
        dom,
        contentDOM,
        update(updated) {
          if (updated.type !== initial.type) return false;
          node = updated;
          render();
          return true;
        },
        stopEvent(event) {
          return (
            event.target instanceof window.Node &&
            control.contains(event.target)
          );
        },
        ignoreMutation(mutation) {
          return (
            mutation.type !== "selection" &&
            (mutation.target === dom || control.contains(mutation.target))
          );
        },
        destroy() {
          root.unmount();
        },
      };
    };
  },
});
