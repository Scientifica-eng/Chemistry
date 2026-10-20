import { readFileSync, existsSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("styles.css", "utf8");
const js = readFileSync("app.js", "utf8");

const requiredHtmlIds = [
  "main", "objectives", "concepts", "methods", "calculators", "safety",
  "practice", "exerciseGrid", "solidCalc", "stockCalc", "dilutionCalc",
  "scoreValue", "quizProgress", "resetQuiz", "themeToggle"
];

const errors = [];
for (const id of requiredHtmlIds) {
  if (!html.includes('id="' + id + '"')) errors.push("Missing HTML anchor/element: " + id);
}
for (const asset of ["styles.css", "app.js"]) {
  if (!existsSync(asset)) errors.push("Missing local asset: " + asset);
}
if (!html.includes('lang="ar"') || !html.includes('dir="rtl"')) {
  errors.push("The page must declare Arabic language and RTL direction.");
}
if (!html.includes('href="styles.css"') || !html.includes('src="app.js"')) {
  errors.push("The HTML must link the stylesheet and application script.");
}

const ids = [...js.matchAll(/\{id:(\d+),cat:/g)].map((match) => Number(match[1]));
if (ids.length !== 28) errors.push("Expected 28 quiz items, found " + ids.length + ".");
if (ids.some((id, index) => id !== index + 1)) errors.push("Quiz IDs must be sequential from 1 through 28.");
for (const formula of ["C₁V₁ = C₂V₂", "1000", "awarded", "revealed"]) {
  if (!js.includes(formula)) errors.push("Missing expected interaction/formula marker: " + formula);
}
if (!css.includes("@media(max-width:760px)") && !css.includes("@media (max-width: 760px)")) {
  errors.push("Responsive mobile CSS breakpoint is missing.");
}
if (!css.includes("dark-mode")) errors.push("Dark theme CSS is missing.");

if (errors.length) {
  console.error("Static lesson validation failed:");
  for (const error of errors) console.error(" - " + error);
  process.exit(1);
}
console.log("Static lesson validation passed: required sections/assets, RTL, responsive and dark styles, and 28 sequential exercises.");
