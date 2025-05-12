import { NodeProp, type SyntaxNodeRef, type Tree, TreeCursor, TreeFragment } from "@lezer/common";
import { parser as baseParser } from "./src/markdown";
import { GFM } from "./src/extension";
const parser = baseParser.configure([GFM]);
console.log(parser.nodeSet);

interface MarkdownNode {
  type: string;
  from: number;
  to: number;
  children?: MarkdownNode[];
  value?: string;
}

const toAst = (input: string, tree: Tree, breakpoints: number[]): MarkdownNode => {
  const cursor = tree.cursor();

  const doc: MarkdownNode = {
    type: "Document",
    from: 0,
    to: input.length,
    value: input,
    children: [],
  }

  const blocks: MarkdownNode[] = [doc];
  const currentBlock = () => blocks[blocks.length - 1];
  const pushChild = (child: MarkdownNode) => {
    currentBlock().children?.push(child);
  }

  const insertText = (from: number, to: number) => {
    let last = from;
    for (const c of breakpoints) {
      if (c > from && c < to) {
        pushChild({
          type: "Text",
          from: last,
          to: c,
          value: input.slice(last, c),
        })
        last = c;
      }
    }
    if (last < to) {
      pushChild({
        type: "Text",
        from: last,
        to: to,
        value: input.slice(last, to),
      })
    }
  }

  const parseInline = (cursor: TreeCursor) => {
    if (!cursor.firstChild()) {
      insertText(cursor.from, cursor.to);
      return;
    }

    do {
      console.log(cursor.type.name);
    } while (cursor.nextSibling());
  }

  while (cursor.next()) {
    const groups = cursor.type.prop(NodeProp.group);
    const isBlock = !!groups?.includes("Block");
    const isLeaf = !!groups?.includes("LeafBlock");
    const isInline = !isBlock;

    if (isBlock) {
      const block: MarkdownNode = {
        type: cursor.type.name,
        from: cursor.from,
        to: cursor.to,
        value: input.slice(cursor.from, cursor.to),
        children: [],
      }
      pushChild(block);
      blocks.push(block);

      if (isLeaf) {
        parseInline(cursor);
      }

      blocks.pop();
    }
    // console.log(cursor.type, cursor.type.prop(NodeProp.group));
  }

  return doc;
};

let doc = "## hi *there*\n\nCo";
let tree = parser.parse(doc);
let fragments = TreeFragment.addTree(tree);
// console.log("Raw tree structure:");
// console.log(tree.toString());


doc += "ol";
tree = parser.parse(doc, fragments);
fragments = TreeFragment.addTree(tree, fragments);
// console.log(tree.toString());

// tree.iterate({
//   enter: n => {
//     console.log(n);
//   }
// })

console.log("\nAST structure:");
console.log(JSON.stringify(toAst(doc, tree, parser.breakpoints), null, 2));