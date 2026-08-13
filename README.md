# AI UI

AI interaction primitives for every web app.

One component for chat. A universal protocol for AI interactions. Beautiful defaults, complete control, and no dependency on a particular AI provider or framework.

## Packages

- `@ai-ui/core` — provider-neutral interaction protocol and headless runtime
- `@ai-ui/web` — framework-independent Web Components

## Quick start

```html
<script type="module" src="@ai-ui/web"></script>
<ai-chat endpoint="/api/ai"></ai-chat>
```

## Protocol-first architecture

`@ai-ui/core` exposes a canonical event stream (`AIEvent`) that the UI can render independent of provider:

- `session.started`
- `message.started`
- `text.delta`
- `reasoning.delta`
- `tool.call.started`
- `tool.call.delta`
- `tool.call.completed`
- `tool.approval.required`
- `artifact.created`
- `citation.added`
- `message.completed`
- `error.occurred`
- `session.completed`
