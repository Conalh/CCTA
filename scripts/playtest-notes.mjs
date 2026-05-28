import { readFile } from "node:fs/promises";

const notes = await readFile("docs/PRIVATE_PLAYTEST.md", "utf8");
console.log(notes.trimEnd());
