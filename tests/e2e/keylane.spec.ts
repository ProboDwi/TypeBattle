import { expect, test, type Locator, type Page } from "@playwright/test";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function finishVisibleTypingArea(
  page: Page,
  areaLabel: "Area mengetik" | "Area balapan",
  inputLabel: "Input teks permainan" | "Input balapan",
  delay = 1,
) {
  const area = page.getByLabel(areaLabel, { exact: true });
  await expect(area).toBeVisible({ timeout: 10_000 });
  // The typing surface is visible behind the standard three-second countdown.
  await page.waitForTimeout(3_500);
  const target = await area.getAttribute("data-target-text");
  expect(target).toBeTruthy();
  const input: Locator = page.getByLabel(inputLabel, { exact: true });
  await input.pressSequentially(target!, { delay });
}

test("landing, completed guest practice, and leaderboard are usable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Ngetik cepat/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Mulai latihan/ })
    .first()
    .click();
  await expect(page).toHaveURL(/practice/);
  await page.getByLabel("Tingkat kesulitan").selectOption("easy");
  await page.getByRole("button", { name: "Mulai latihan" }).click();
  await finishVisibleTypingArea(page, "Area mengetik", "Input teks permainan");
  await expect(page.getByText("Sesi selesai")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Hasil tamu tersimpan/)).toBeVisible();
  await page.getByRole("button", { name: "Kembali ke menu latihan" }).click();
  await expect(
    page.getByRole("heading", { name: "Pilih ritme latihan." }),
  ).toBeVisible();
  await page.goto("/leaderboard");
  await expect(
    page.getByRole("heading", { name: "Papan peringkat." }),
  ).toBeVisible();
});

test("registration form creates a new profile when a disposable account is configured", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_SIGNUP_EMAIL || !process.env.E2E_SIGNUP_PASSWORD,
    "Disposable E2E sign-up credentials are not configured",
  );
  const suffix = Date.now().toString().slice(-8);
  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(process.env.E2E_SIGNUP_EMAIL!);
  await page.getByLabel("Username").fill(`e2e_${suffix}`);
  await page.getByLabel("Nama tampilan").fill("Pemain E2E");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_SIGNUP_PASSWORD!);
  await page
    .getByLabel("Konfirmasi password")
    .fill(process.env.E2E_SIGNUP_PASSWORD!);
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(
    page.getByText(/Akun berhasil dibuat|Periksa email/),
  ).toBeVisible();
});

test("player can sign in, complete practice, create a room, and is denied admin", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_PLAYER_EMAIL || !process.env.E2E_PLAYER_PASSWORD,
    "E2E player credentials are not configured",
  );
  await signIn(
    page,
    process.env.E2E_PLAYER_EMAIL!,
    process.env.E2E_PLAYER_PASSWORD!,
  );
  await page.goto("/practice");
  await page.getByLabel("Tingkat kesulitan").selectOption("easy");
  await page.getByRole("button", { name: "Mulai latihan" }).click();
  await finishVisibleTypingArea(
    page,
    "Area mengetik",
    "Input teks permainan",
    30,
  );
  await expect(page.getByText("Sesi selesai")).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(
      "Hasil resmi tersimpan ke akun dan sudah tersedia di dashboard.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/Hasil tamu tersimpan/)).toHaveCount(0);
  await page.goto("/race/create");
  await page.getByLabel("Nama room").fill("Playwright Sprint");
  await page.getByRole("button", { name: "Buat room" }).click();
  await expect(page).toHaveURL(/race\/[A-HJ-NP-Z2-9]{6}/);
  const roomCode = page.url().split("/").pop()!;
  await page.goto("/race");
  await expect(page.getByText("Room aktif kamu")).toBeVisible();
  await expect(page.getByText(roomCode, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Batalkan room" }).click();
  const confirmation = page.getByRole("dialog", {
    name: "Batalkan room ini?",
  });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Ya, batalkan room" }).click();
  await expect(page.getByText("Room aktif kamu")).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
});

test("two players can join, ready, start, and finish one race", async ({
  browser,
}) => {
  test.skip(
    !process.env.E2E_PLAYER_EMAIL ||
      !process.env.E2E_PLAYER_PASSWORD ||
      !process.env.E2E_PLAYER_TWO_EMAIL ||
      !process.env.E2E_PLAYER_TWO_PASSWORD,
    "Two player accounts are not configured",
  );
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await signIn(
    host,
    process.env.E2E_PLAYER_EMAIL!,
    process.env.E2E_PLAYER_PASSWORD!,
  );
  await signIn(
    guest,
    process.env.E2E_PLAYER_TWO_EMAIL!,
    process.env.E2E_PLAYER_TWO_PASSWORD!,
  );
  await host.goto("/race/create");
  await host.getByLabel("Nama room").fill("Dua Context");
  await host.getByLabel("Tingkat kesulitan").selectOption("easy");
  await host.getByRole("button", { name: "Buat room" }).click();
  const code = host.url().split("/").pop()!;
  await guest.goto(`/race/join?code=${code}`);
  await guest.getByRole("button", { name: "Gabung room" }).click();
  await expect(guest.getByText("Dua Context")).toBeVisible();

  await host.getByRole("button", { name: "Saya siap" }).click();
  await guest.getByRole("button", { name: "Saya siap" }).click();
  await expect(host.getByText("SIAP")).toHaveCount(2, { timeout: 15_000 });
  await host.getByRole("button", { name: "Mulai balapan" }).click();
  await expect(host.getByLabel("Area balapan")).toBeVisible({
    timeout: 15_000,
  });
  await expect(guest.getByLabel("Area balapan")).toBeVisible({
    timeout: 15_000,
  });

  await Promise.all([
    finishVisibleTypingArea(host, "Area balapan", "Input balapan", 30),
    finishVisibleTypingArea(guest, "Area balapan", "Input balapan", 30),
  ]);
  await expect(host.getByText(/Finis sementara|Race finished/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(guest.getByText(/Finis sementara|Race finished/)).toBeVisible({
    timeout: 20_000,
  });

  await hostContext.close();
  await guestContext.close();
});

test("admin can create and publish a typing text", async ({ page }) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    "E2E admin credentials are not configured",
  );
  await signIn(
    page,
    process.env.E2E_ADMIN_EMAIL!,
    process.env.E2E_ADMIN_PASSWORD!,
  );
  await page.goto("/admin/texts/new");
  await expect(
    page.getByRole("heading", { name: "Tambahkan teks." }),
  ).toBeVisible();
  const title = `Teks E2E ${Date.now()}`;
  await page.getByLabel("Judul").fill(title);
  await page
    .getByLabel("Isi teks")
    .fill(
      "Pengujian otomatis memastikan alur pengelolaan teks berjalan dari formulir admin sampai data tersimpan. Kalimat ini sengaja dibuat cukup panjang, original, dan mudah diverifikasi setelah proses publikasi selesai.",
    );
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Simpan teks" }).click();
  await expect(page).toHaveURL(/\/admin\/texts$/);
  await expect(page.getByText(title)).toBeVisible();
});
