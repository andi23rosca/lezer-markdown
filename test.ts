import { NodeProp, type SyntaxNodeRef, Tree, TreeCursor, TreeFragment } from "@lezer/common";
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
  leaf?: boolean;
  container?: boolean;
}

const toAst = (input: string, tree: Tree, breakpoints: number[]): MarkdownNode => {
  console.log(JSON.stringify(input));
  console.log(tree.toString());

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
    if (from === to) {
      return;
    }

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


  tree.iterate({
    enter: node => {
      if (node.type.name === "Document") return;
      const groups = node.type.prop(NodeProp.group);
      const isBlock = !!groups?.includes("Block");
      const isBlockContext = !!groups?.includes("BlockContext");
      const isLeaf = !!groups?.includes("LeafBlock");
      const parent = currentBlock()!;

      const n: MarkdownNode = {
        type: node.type.name,
        from: node.from,
        to: node.to,
        value: input.slice(node.from, node.to),
        children: []
      }
      console.log("enter", node.node);

      const lastOffset = parent.children?.at(-1)?.to || parent.to;

      if (n.from > lastOffset) {
        insertText(lastOffset, n.from);
      }

      pushChild(n);
      blocks.push(n);


    },
    leave: node => {
      if (node.type.name === "Document") return;
      blocks.pop();
    }
  })

  return doc;
};

// let doc = "## hi *there*\n\n- Co";
let doc = "## hi *the\n\n";
let tree = parser.parse(doc);
let fragments = TreeFragment.addTree(tree);
// console.log("Raw tree structure:");
// console.log(tree.toString());


doc += "re*";
tree = parser.parse(doc, fragments);
fragments = TreeFragment.addTree(tree, fragments);
console.log(tree.toString());

// tree.iterate({
//   enter: n => {
//     console.log(n);
//   }
// })

console.log("\nAST structure:");
console.log(JSON.stringify(toAst(doc, tree, parser.breakpoints), null, 2));