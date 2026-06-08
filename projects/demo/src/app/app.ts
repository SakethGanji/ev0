import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { Editor } from '@tiptap/core';
import { TipEditorComponent } from 'editor-core';

const SAMPLE_CONTENT = `
<h2>Welcome to your editor</h2>
<p>This is a single <strong>tip-editor</strong> component — toolbar, content, character counter, table-of-contents and comments all bundled together. Try the controls in the toolbar.</p>
<h3>Comments</h3>
<p>Select any of this text, then open the comments panel from the toolbar and click <strong>+ New</strong>. Highlighted ranges turn amber; click them to activate. Multiple comments on the same text overlap — try it.</p>
<h3>Format text</h3>
<p>Use <strong>bold</strong>, <em>italic</em>, <s>strike</s>, or <code>inline code</code>. Change the paragraph style from the dropdown in the toolbar. Color text or highlight a passage from the colour pickers.</p>
<h3>Insert things</h3>
<ul>
  <li>Click <strong>Insert</strong> to add a table, a horizontal rule, a code block, or a line break.</li>
  <li>Use the picture and film icons to insert images and videos.</li>
  <li>The cloud / arrow icons import a file or export the document in HTML, JSON, Markdown, DOCX or PDF.</li>
</ul>
<h3>Search and navigate</h3>
<p>Press <strong>Ctrl + F</strong> (or click the search icon) to find and replace. Click the panel icon on the right to open the contents sidebar.</p>
<pre><code class="language-css">/* Code blocks look like this. */
body { display: none; }</code></pre>
<blockquote>That's the tour. Start typing to make it yours.</blockquote>
`;

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TipEditorComponent],
  template: `
    <main class="demo-shell">
      <header>
        <h1>Editor</h1>
        <p>One Angular component. Tiptap v3, signals, standalone.</p>
      </header>
      <tip-editor
        [content]="content"
        [characterLimit]="characterLimit"
        filename="document"
        (editorReady)="onReady($event)"
      />
    </main>
  `,
  styleUrl: './app.scss',
})
export class App {
  protected readonly characterLimit = 10_000;
  protected readonly content = SAMPLE_CONTENT;

  protected onReady(editor: Editor): void {
    void editor;
  }
}
