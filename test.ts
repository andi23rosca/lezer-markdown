import { NodeProp, type SyntaxNodeRef, Tree, TreeCursor, TreeFragment } from "@lezer/common";
import { parser as baseParser } from "./src/markdown";
import { GFM } from "./src/extension";
const parser = baseParser.configure([GFM]);
console.log(parser.nodeSet);
const nodeTypes = [
  "",
  "Document",
  "CodeBlock",
  "FencedCode",
  "Blockquote",
  "HorizontalRule",
  "BulletList",
  "OrderedList",
  "ListItem",
  "ATXHeading1",
  "ATXHeading2",
  "ATXHeading3",
  "ATXHeading4",
  "ATXHeading5",
  "ATXHeading6",
  "SetextHeading1",
  "SetextHeading2",
  "HTMLBlock",
  "LinkReference",
  "Paragraph",
  "CommentBlock",
  "ProcessingInstructionBlock",
  "Escape",
  "Entity",
  "HardBreak",
  "Emphasis",
  "StrongEmphasis",
  "Link",
  "Image",
  "InlineCode",
  "HTMLTag",
  "Comment",
  "ProcessingInstruction",
  "Autolink",
  "HeaderMark",
  "QuoteMark",
  "ListMark",
  "LinkMark",
  "EmphasisMark",
  "CodeMark",
  "CodeText",
  "CodeInfo",
  "LinkTitle",
  "LinkLabel",
  "URL",
  "Table",
  "TableHeader",
  "TableRow",
  "TableCell",
  "TableDelimiter",
  "Task",
  "TaskMarker",
  "Strikethrough",
  "StrikethroughMark"
]
interface MarkdownNode {
  type: string;
  from: number;
  to: number;
  children?: MarkdownNode[];
  value?: string;
  leaf?: boolean;
  container?: boolean;
}
const printTree = (input: string, tree: Tree) => {
  let depth = 0;
  const enter = (node: TreeCursor) => {
    if (depth === 0) {
      console.log(node.type.name);
      return true;
    }
    console.log(`${"| ".repeat(depth)}${node.type.name} ${node.type.name === "Text" ? JSON.stringify(input.slice(node.from, node.to)) : ""}`);
    return true;
  }
  const leave = (node: TreeCursor) => {
    // console.log("leave", "|" + " ".repeat(depth * 2), node.type.name)
  }
  const cursor = tree.cursor();
  outer: while (true) {
    if (enter(cursor) !== false) {
      if (cursor.firstChild()) {
        depth++;
        continue;
      }
    }
    while (true) {
      if (leave)
        leave(cursor);
      if (!depth)
        break outer;
      if (cursor.nextSibling())
        break;
      cursor.parent();
      depth--;
    }
  }
}

const toAst = (input: string, tree: Tree, breakpoints: number[]): MarkdownNode => {
  console.log(JSON.stringify(input));
  printTree(input, tree);

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

  const skippable = ["HeaderMark", "EmphasisMark"];

  console.log(parser.breakpoints);

  const cursor = tree.cursor();
  let depth = 0;
  outer: while (true) {
    if (cursor.type.name === "Document" && cursor.firstChild()) {
      depth++;
      continue;
    }

    const node: MarkdownNode = {
      type: cursor.type.name,
      from: cursor.from,
      to: cursor.to,
      value: cursor.type.name === "Text" ? input.slice(cursor.from, cursor.to) : undefined,
      children: [],
    }
    if (!skippable.includes(cursor.type.name)) {
      pushChild(node);
    }
    blocks.push(node);

    if (cursor.firstChild()) {
      depth++;
      continue;
    }

    inner: while (true) {
      if (!depth)
        break outer;
      if (cursor.nextSibling()) {
        blocks.pop();
        break inner;
      }
      cursor.parent();
      blocks.pop();
      depth--;
    }
  }

  return doc;
};


const createParser = (initial: string) => {
  let doc = initial;
  let tree = parser.parse(doc);
  let fragments = TreeFragment.addTree(tree);
  console.log(JSON.stringify(toAst(doc, tree, parser.breakpoints), null, 2));
  return {
    append: (text: string) => {
      doc += text;
      tree = parser.parse(doc, fragments);
      fragments = TreeFragment.addTree(tree, fragments);
      console.log(JSON.stringify(toAst(doc, tree, parser.breakpoints), null, 2));
    }

  }
}

const p = createParser("# cool ***all* fd**");