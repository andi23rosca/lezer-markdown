import { type SyntaxNodeRef, type Tree, TreeFragment } from "@lezer/common";
import { parser } from "./dist/index.js";


let doc = "**hi _c";
let tree = parser.parse(doc);
let fragments = TreeFragment.addTree(tree);
console.log(tree.toString());

doc += "o_ ol**";
tree = parser.parse(doc, fragments);
fragments = TreeFragment.addTree(tree, fragments);
console.log(tree.toString());
