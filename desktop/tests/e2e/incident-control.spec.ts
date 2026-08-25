import { expect, test } from "@playwright/test";
import { waitForAnimations } from "../helpers/animations";
import { installMockBridge } from "../helpers/bridge";

const SHOTS = "test-results/incident-control";

test("CO starts an incident plan and sees the same follow-ups in the command brief", async ({
  page,
}) => {
  await installMockBridge(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#/incidents", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("incident-control-screen")).toBeVisible();

  await page.getByTestId("start-incident").click();
  await page.getByLabel("Incident reference").fill("INC-2026-014");
  await page.getByLabel("Incident title").fill("Workplace safety occurrence");
  await page
    .getByLabel("Initial situation summary")
    .fill("A workplace occurrence was reported during the morning watch.");
  await page
    .getByLabel("Immediate risk and action")
    .fill("The affected workspace was isolated and access restricted.");
  await page
    .getByLabel("Medical or welfare support")
    .fill("Medical assessment and member welfare support were offered.");
  await page
    .getByLabel("Workplace controls")
    .fill("The space remains isolated pending specialist assessment.");
  await page
    .getByLabel("Evidence preservation")
    .fill("The scene, logs, and relevant records were preserved.");
  await page
    .getByLabel("Verified facts, one per line")
    .fill("A report was received at 1000.\nThe workspace was isolated.");
  await page
    .getByLabel("Unknowns, one per line")
    .fill("Specialist assessment remains outstanding.");
  await page.getByRole("button", { name: "Start incident plan" }).click();

  await expect(page.getByTestId("incident-detail-screen")).toBeVisible();
  await expect(page.getByText("Immediate safety").first()).toBeVisible();
  await page.getByRole("button", { name: "Add follow-up" }).first().click();
  const actionDialog = page.getByRole("dialog", {
    name: "Add follow-up action",
  });
  await actionDialog
    .getByLabel("Action", { exact: true })
    .fill("Provide the CO with the initial personnel update");
  await actionDialog.getByLabel("Responsible role").selectOption("N1");
  await actionDialog.getByLabel("Status").selectOption("inProgress");
  await actionDialog.getByLabel("Due at").fill("2026-08-20T09:00");
  await actionDialog.getByRole("button", { name: "Save action" }).click();
  await expect(
    page.getByText("Provide the CO with the initial personnel update").first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Incident Control" }).first().click();
  await expect(page.getByTestId("incident-control-screen")).toBeVisible();
  await expect(
    page.locator('[data-testid^="incident-card-"]').getByText("INC-2026-014"),
  ).toBeVisible();
  await expect(page.getByTestId("incident-follow-ups")).toContainText(
    "Confirm immediate safety",
  );
  await expect(page.getByTestId("incident-follow-ups")).toContainText(
    "Provide the CO with the initial personnel update",
  );
  await page
    .getByText("Follow-up action added")
    .waitFor({ state: "hidden", timeout: 7_000 });
  await waitForAnimations(page);
  await page
    .getByTestId("incident-control-screen")
    .screenshot({ path: `${SHOTS}/01-incident-control-dashboard.png` });

  await page.goto("/#/console", { waitUntil: "domcontentloaded" });
  const briefPanel = page.getByTestId("command-brief-incident-follow-ups");
  await expect(briefPanel).toBeVisible();
  await expect(briefPanel).toContainText("Confirm immediate safety");
  await expect(briefPanel).toContainText(
    "Provide the CO with the initial personnel update",
  );
  await waitForAnimations(page);
  await briefPanel.screenshot({
    path: `${SHOTS}/02-command-brief-follow-ups.png`,
  });
});
