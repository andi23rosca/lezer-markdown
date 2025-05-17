import { Tree, TreeCursor, TreeFragment } from "@lezer/common";
import { parser as baseParser } from "./src/markdown";
import { GFM } from "./src/extension";
import { createStore, reconcile } from "solid-js/store";
import { For, Match, render, Switch } from "solid-js/web";
import { batch } from "solid-js";

const parser = baseParser.configure([GFM]);
// console.log(parser.nodeSet);
// const nodeTypes = [
//   "",
//   "Document",
//   "CodeBlock",
//   "FencedCode",
//   "Blockquote",
//   "HorizontalRule",
//   "BulletList",
//   "OrderedList",
//   "ListItem",
//   "ATXHeading1",
//   "ATXHeading2",
//   "ATXHeading3",
//   "ATXHeading4",
//   "ATXHeading5",
//   "ATXHeading6",
//   "SetextHeading1",
//   "SetextHeading2",
//   "HTMLBlock",
//   "LinkReference",
//   "Paragraph",
//   "CommentBlock",
//   "ProcessingInstructionBlock",
//   "Escape",
//   "Entity",
//   "HardBreak",
//   "Emphasis",
//   "StrongEmphasis",
//   "Link",
//   "Image",
//   "InlineCode",
//   "HTMLTag",
//   "Comment",
//   "ProcessingInstruction",
//   "Autolink",
//   "HeaderMark",
//   "QuoteMark",
//   "ListMark",
//   "LinkMark",
//   "EmphasisMark",
//   "CodeMark",
//   "CodeText",
//   "CodeInfo",
//   "LinkTitle",
//   "LinkLabel",
//   "URL",
//   "Table",
//   "TableHeader",
//   "TableRow",
//   "TableCell",
//   "TableDelimiter",
//   "Task",
//   "TaskMarker",
//   "Strikethrough",
//   "StrikethroughMark"
// ]

const LOG = false;


interface MarkdownNode {
  type: string;
  from: number;
  to: number;
  children?: MarkdownNode[];
}
const printTree = (input: string, tree: Tree) => {
  let depth = 0;
  const enter = (node: TreeCursor) => {
    if (depth === 0) {
      console.log(node.type.name);
      return true;
    }
    console.log(`${"| ".repeat(depth)}${node.type.name} ${node.from} ${node.to} ${JSON.stringify(input.slice(node.from, node.to))}`);
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
  // console.log(JSON.stringify(input));
  printTree(input, tree);

  const doc: MarkdownNode = {
    type: "Document",
    from: 0,
    to: input.length,
    children: [],
  }

  const blocks: MarkdownNode[] = [doc];
  const currentBlock = () => blocks[blocks.length - 1];
  const pushChild = (child: MarkdownNode) => {
    currentBlock().children?.push(child);
  }

  const skippable = ["HeaderMark", "EmphasisMark", "ListMark", "CodeMark", "LinkMark"];

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
      // value: cursor.type.name === "Text" ? input.slice(cursor.from, cursor.to) : undefined,
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


const [store, setStore] = createStore({
  doc: "",
  ast: {
    type: "Document",
    from: 0,
    to: 0,
    children: [],
  } as MarkdownNode,
})

const createParser = (initial: string) => {
  let doc = initial;
  let tree = parser.parse(doc);
  let fragments = TreeFragment.addTree(tree);
  const ast = toAst(doc, tree, parser.breakpoints);
  setStore(reconcile({
    doc,
    ast: ast,
  }));
  if (LOG) console.log(JSON.stringify(ast, null, 2));
  return {
    append: (text: string) => {
      batch(() => {
      doc += text;
      setStore("doc", doc);
      fragments = TreeFragment.applyChanges(
        fragments,
        [
          {
            fromA: doc.length,
            toA: doc.length,
            fromB: doc.length,
            toB: doc.length + text.length,
          },
        ],
        2,
      );
      tree = parser.parse(doc, fragments);
      fragments = TreeFragment.addTree(tree, fragments);
      const ast = toAst(doc, tree, parser.breakpoints);
      setStore("ast", reconcile(ast));
      if (LOG) console.log(JSON.stringify(ast, null, 2));
    })
    }
  }
}

const p = createParser("[hi]");
// p.append("\n\nnew block")

const toStream = `
# Welcome to Markdown Demo

This is a **bold** demonstration of _markdown_ formatting capabilities.

You can create soft breaks in Markdown by adding two spaces at the end of a line.  
This creates a line break without starting a new paragraph.  
It's useful for formatting poetry, addresses, or any content where you want to maintain  
a specific line structure without the extra spacing that comes with paragraphs.  
Soft breaks are particularly helpful when you need to control the visual flow of text  
while keeping it all within a single semantic paragraph element.  
This makes your content both visually appealing and semantically correct for screen readers  
and other accessibility tools that might be used to navigate your markdown content.



## Features

* Lists are easy to create
* And they help organize information
* **Bold** and _italic_ text can be combined for _**emphasis**_

### Links and More

Check out [Solid.js](https://www.solidjs.com/) for more information about the framework.

> Blockquotes provide a nice way to highlight important information
> or to quote someone famous.

Code can be included inline with \`backticks\` or in blocks:

\`\`\`js
function hello() {
  console.log("Hello, markdown!");
}
\`\`\`
`

// const toStream = "cool"

async function stream() {
  for (let i = 0; i < toStream.length; i+=30) {
    const chunk = toStream.slice(i, i+30);
    await new Promise(resolve => setTimeout(resolve, 100));
    p.append(chunk);
  }

  console.log(JSON.stringify(store.ast, null, 2));
}
// stream();


const NodeComp = (props: {node: MarkdownNode}) => {
  return <Switch>
    <Match when={props.node.type === "Document"}>
      <div class="markdown">
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </div>
    </Match>
    <Match when={props.node.type === "Paragraph"}>
      <p class="fade-in">
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </p>
    </Match>
    <Match when={props.node.type === "ATXHeading1"}>
      <h1>
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </h1>
    </Match>
    <Match when={props.node.type === "ATXHeading2"}>
      <h2>
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </h2>
    </Match>
    <Match when={props.node.type === "ATXHeading3"}>
      <h3>
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </h3>
    </Match>
    <Match when={props.node.type === "ATXHeading4"}>
      <h4>
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </h4>
    </Match>
    <Match when={props.node.type === "ATXHeading5"}>
      <h5>
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </h5>
    </Match>
    <Match when={props.node.type === "ATXHeading6"}>
      <h6>
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </h6>
    </Match>
    <Match when={props.node.type === "BulletList"}>
      <ul>
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </ul>
    </Match>
    <Match when={props.node.type === "ListItem"}>
      <li class="fade-in">
        <For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For>
      </li>
    </Match>
    
    <Match when={props.node.type === "Text"}>
      <span class="fade-in">{store.doc.slice(props.node.from, props.node.to)}</span>
    </Match>
    <Match when={props.node.type === "Emphasis" || props.node.type === "EmphasisPartial"}>
      <i><For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For></i>
    </Match>
    <Match when={props.node.type === "StrongEmphasis" || props.node.type === "StrongEmphasisPartial"}>
      <strong><For each={props.node.children}>
          {(c) => <NodeComp node={c} />}
        </For></strong>
    </Match>
    <Match when={props.node.type === "FencedCode"}>
        <pre data-language={store.doc.slice(props.node.children.find(c => c.type === "CodeInfo")?.from, props.node.children.find(c => c.type === "CodeInfo")?.to)}>
          <For each={props.node.children}>
            {(c) => <NodeComp node={c} />}
          </For>
        </pre>
      </Match>
      <Match when={props.node.type === "CodeText"}>
        <code class="fade-in">
          {store.doc.slice(props.node.from, props.node.to)}
        </code>
      </Match>
      <Match when={props.node.type === "Link"}>
        {() => {
          const url = () => props.node.children?.find(c => c.type === "URL");
          return <a href={url() ? store.doc.slice(url()?.from, url()?.to) : ""}>
          <For each={props.node.children}>
            {(c) => <NodeComp node={c} />}
          </For>
        </a>
        }}
      </Match>
      <Match when={props.node.type === "Blockquote"}>
        <blockquote>
          <For each={props.node.children}>
            {(c) => <NodeComp node={c} />}
          </For>
        </blockquote>
      </Match>
      <Match when={props.node.type === "InlineCode"}>
        <code class="fade-in">
          {store.doc.slice(props.node.from + 1, props.node.to - 1)}
        </code>
      </Match>
  </Switch>
}
render(() => <div>
  <button onClick={() => stream()}>Stream</button>
  <NodeComp node={store.ast} />
</div>, document.getElementById("app")!)