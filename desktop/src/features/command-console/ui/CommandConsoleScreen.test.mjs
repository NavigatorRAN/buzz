import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

import { CommandConsoleScreen } from "./CommandConsoleScreen.tsx";
import { CommandTeamStripView } from "./CommandTeamStrip.tsx";
import { ModelRoutingControls } from "./ModelRoutingControls.tsx";

async function renderCommandConsole() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function ConsoleUnderTest() {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(CommandConsoleScreen, {
        decisionActions: {
          executions: [],
          pendingKeys: new Set(),
          issue: () => {},
          retry: () => {},
          openConversation: () => {},
        },
        commandTeam: React.createElement(CommandTeamStripView, {
          error: null,
          onMessage: () => {},
          pendingPersonaIds: new Set(),
        }),
      }),
    );
  }
  const rootRoute = createRootRoute({ component: ConsoleUnderTest });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: rootRoute.addChildren([indexRoute]),
  });
  await router.load();
  return renderToStaticMarkup(React.createElement(RouterProvider, { router }));
}

test("CommandConsoleScreen renders the usable Command Adviser route", async () => {
  const html = await renderCommandConsole();

  assert.match(html, /data-testid="command-console-screen"/);
  assert.match(html, /data-testid="command-console-official-banner"/);
  assert.match(html, /data-testid="model-routing-controls"/);
  assert.match(html, />COMMAND ADVISER</);
  assert.match(html, /Cloud models first/i);
  assert.match(html, /Local model first/i);
  assert.match(html, /Local only/i);
  assert.match(html, /all managed agents and generated work/i);
  assert.match(html, /gemma4-26b-official/i);
  assert.match(html, /HMAS SUPPLY · A195/);
  assert.match(html, /STRENGTHEN THE SHIELD/);
  assert.match(html, /alt="HMAS Supply at sea"/);
  for (const adviser of [
    "chief-of-staff",
    "operations",
    "intelligence",
    "logistics",
    "navigation",
    "daily-routine",
    "reporting",
    "plans",
  ]) {
    assert.match(html, new RegExp(`data-testid="adviser-insignia-${adviser}"`));
  }
  assert.equal((html.match(/>Message</g) ?? []).length, 8);
  assert.doesNotMatch(html, />Command Console</);
  assert.doesNotMatch(html, /unsigned|fingerprint|replication/i);
});

test("CommandConsoleScreen installs the real advisory Daily Command Brief without not-operational claims", async () => {
  const html = await renderCommandConsole();

  assert.match(html, /data-testid="daily-command-brief"/);
  assert.match(html, />Daily Command Brief</);
  assert.match(html, /Advisory, non-accredited decision support/);
  assert.doesNotMatch(html, /not yet operational/i);
});

test("model routing cannot interrupt active agent work", () => {
  const html = renderToStaticMarkup(
    React.createElement(ModelRoutingControls, {
      activeWork: true,
      disabled: false,
      error: null,
      onChange: () => {},
      preference: "cloud_first",
    }),
  );

  assert.match(html, /active agent work must finish before switching/i);
  assert.equal((html.match(/ disabled=""/g) ?? []).length, 3);
});
