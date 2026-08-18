import { expect, test } from "@playwright/test";
import { installMockBridge } from "../helpers/bridge";

test("Risk creates and persists a command risk with controls and exports", async ({
  page,
}) => {
  await installMockBridge(page);
  await page.goto("/");
  await page.getByTestId("open-risk-view").click();
  await expect(page).toHaveURL(/#\/risk$/);
  const screen = page.getByTestId("risk-screen");
  await expect(
    screen.getByRole("heading", { name: "Risk", exact: true }),
  ).toBeVisible();
  await expect(screen.getByText("No matching risks")).toBeVisible();

  await screen.getByRole("button", { name: "New risk" }).click();
  const dialog = page.getByRole("dialog", { name: "New risk" });
  await dialog.getByLabel("Risk title").fill("Seaboat davit unavailable");
  await dialog
    .getByLabel("Risk description")
    .fill("The port seaboat davit is unavailable for the deployment.");
  await dialog
    .getByLabel("Consequence if realised")
    .fill("The assigned seaboat mission may not be supportable.");
  await dialog.getByLabel("Scope type").selectOption("activity");
  await dialog.getByLabel("Scope identifier").fill("seaboat-serial");
  await dialog.getByLabel("Scope label").fill("Seaboat serial");
  await dialog.getByRole("button", { name: "Add control" }).click();
  await dialog
    .getByPlaceholder("Control")
    .fill("Repair and function-test davit");
  await dialog.getByRole("button", { name: "Save risk" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(screen.getByText("Seaboat davit unavailable")).toBeVisible();
  await expect(screen.getByText("Seaboat serial")).toBeVisible();
  await expect(screen.getByText("1/1 implemented")).toHaveCount(0);
  await expect(screen.getByText("0/1 implemented")).toBeVisible();
  await screen.getByRole("button", { name: "Excel" }).click();
  await screen.getByRole("button", { name: "PDF" }).click();
});
