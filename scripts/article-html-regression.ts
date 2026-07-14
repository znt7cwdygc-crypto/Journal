import assert from "node:assert/strict";
import { articleBodyToHtml } from "../src/lib/article-html";

const legacy = articleBodyToHtml("Первый абзац с <a href=\"/guides/start\">внутренней ссылкой</a>.\n\nКороткий заголовок\n\nВторой абзац.");
assert.match(legacy, /<p>Первый абзац/);
assert.match(legacy, /<h2>Короткий заголовок<\/h2>/);
assert.match(legacy, /<a href="\/guides\/start">внутренней ссылкой<\/a>/);
assert.doesNotMatch(legacy, /target=\"_blank\"/);
assert.doesNotMatch(legacy, /nofollow/);

const rich = articleBodyToHtml('<h2>Раздел</h2><p><a href="https://example.com">Внешняя ссылка</a></p><script>alert(1)</script>');
assert.match(rich, /<h2>Раздел<\/h2>/);
assert.match(rich, /nofollow noopener noreferrer/);
assert.match(rich, /target=\"_blank\"/);
assert.doesNotMatch(rich, /script|alert/);

const sameDomain = articleBodyToHtml('<p><a href="https://mycamdesk.com/guides/start?from=test">Гайд</a></p>');
assert.match(sameDomain, /href=\"\/guides\/start\?from=test\"/);
assert.doesNotMatch(sameDomain, /nofollow/);

const escaped = articleBodyToHtml("Обычный <script>alert(1)</script> текст.");
assert.doesNotMatch(escaped, /<script>/);
assert.match(escaped, /&lt;script&gt;/);

console.log("Article HTML regression checks passed");
