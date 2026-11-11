// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { rules } from './cssHarness';

const source = 'packages/web/src';
const files = readdirSync(source, { recursive: true, encoding: 'utf8' }).filter(
  (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file),
);
const globals = new Set(['hud', 'boot']);

it('uses real module exports and never looks up or writes generated class strings', () => {
  expect(existsSync(`${source}/styles/classes.ts`)).toBe(false);
  for (const file of files) {
    const path = `${source}/${file}`;
    const ast = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const imports = new Map<string, Set<string>>();
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      expect(specifier, file).not.toContain('styles/classes');
      if (!specifier.endsWith('.module.css')) continue;
      const binding = statement.importClause?.name?.text;
      expect(binding, `${file}: module imports must consume the default export`).toBeTruthy();
      const css = readFileSync(resolve(dirname(path), specifier), 'utf8').replace(/:global\([^)]+\)/g, '');
      imports.set(
        binding!,
        new Set(rules(css).flatMap((rule) => [...rule.selector.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]!))),
      );
    }
    if (file.endsWith('.tsx') && file !== 'main.tsx') {
      expect(imports.has('styles'), `${file} must import its own styles object`).toBe(true);
      expect(readFileSync(path, 'utf8'), file).toContain(`from './${basename(file, '.tsx')}.module.css'`);
    }
    const checkClassValue = (node: ts.Expression): void => {
      if (ts.isStringLiteralLike(node)) expect(globals.has(node.text), `${file}: literal class value`).toBe(true);
      if (ts.isParenthesizedExpression(node)) checkClassValue(node.expression);
      if (ts.isConditionalExpression(node)) {
        checkClassValue(node.whenTrue);
        checkClassValue(node.whenFalse);
      }
      if (ts.isBinaryExpression(node)) {
        checkClassValue(node.right);
        if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) checkClassValue(node.left);
      }
    };
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node)) expect(node.text, file).not.toMatch(/p-[A-Z][A-Za-z]+-[\w-]+/);
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        expect(node.expression.text, file).not.toBe('cx');
        if (node.expression.text === 'cn') {
          for (const arg of node.arguments) checkClassValue(arg);
        }
      }
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(ast) === 'className' &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      )
        expect(globals.has(node.initializer.text), `${file}: literal className`).toBe(true);
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && imports.has(node.expression.text))
        expect(
          imports.get(node.expression.text)!.has(node.name.text),
          `${file}: missing CSS export ${node.getText(ast)}`,
        ).toBe(true);
      if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && imports.has(node.expression.text)) {
        expect(ts.isStringLiteral(node.argumentExpression), `${file}: dynamic class lookup`).toBe(true);
        if (ts.isStringLiteral(node.argumentExpression))
          expect(
            imports.get(node.expression.text)!.has(node.argumentExpression.text),
            `${file}: missing CSS export ${node.getText(ast)}`,
          ).toBe(true);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
});

it('restricts global module selectors to the documented state allowlist', () => {
  for (const file of readdirSync(source, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith('.module.css'),
  )) {
    const css = readFileSync(`${source}/${file}`, 'utf8');
    expect(css, file).not.toMatch(/\.p-[A-Z]/);
    for (const match of css.matchAll(/:global\(([^)]+)\)/g))
      expect(['.proj', '.sky', '.hud', '.boot', '#w-me'], file).toContain(match[1]);
  }
});
