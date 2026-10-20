export function download(
  name: string,
  content: string | Uint8Array,
  type = "text/csv",
) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof content === "string" ? content : new Uint8Array(content)],
      { type },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
