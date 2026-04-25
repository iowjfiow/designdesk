import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding…");

  // Catalog: 3 packages
  await prisma.package.upsert({
    where: { slug: "logo-basic" },
    update: {},
    create: {
      slug: "logo-basic",
      name: "Basic Logo",
      description: "1 concept, 2 revisions, PNG/JPG.",
      priceMinor: 499_00, // ₹499
      currency: "INR",
      concepts: 1,
      revisions: 2,
      deliveryDays: 5,
      includedFiles: ["PNG", "JPG"],
    },
  });
  await prisma.package.upsert({
    where: { slug: "logo-standard" },
    update: {},
    create: {
      slug: "logo-standard",
      name: "Standard Logo",
      description: "3 concepts, 5 revisions, vector files.",
      priceMinor: 2_499_00,
      currency: "INR",
      concepts: 3,
      revisions: 5,
      deliveryDays: 7,
      includedFiles: ["PNG", "JPG", "SVG", "PDF"],
    },
  });
  await prisma.package.upsert({
    where: { slug: "branding-premium" },
    update: {},
    create: {
      slug: "branding-premium",
      name: "Premium Branding",
      description: "Full identity: logo, colours, type, brand guidelines.",
      priceMinor: 9_999_00,
      currency: "INR",
      concepts: 5,
      revisions: 10,
      deliveryDays: 14,
      includedFiles: ["PNG", "JPG", "SVG", "PDF", "AI", "EPS"],
    },
  });

  // Add-ons
  const addons: { slug: string; name: string; description: string; priceMinor: number }[] = [
    { slug: "extra-revision", name: "Extra revision", description: "Add one more revision round.", priceMinor: 499_00 },
    { slug: "express", name: "Express delivery", description: "Cut delivery time in half.", priceMinor: 999_00 },
    { slug: "social-kit", name: "Social media kit", description: "10 sized variants for IG/X/LinkedIn.", priceMinor: 1_499_00 },
    { slug: "source-files", name: "Source files", description: "Editable source bundle (.ai, .psd).", priceMinor: 799_00 },
    { slug: "brand-guidelines", name: "Brand guidelines", description: "Mini PDF guide (logo usage, colours, type).", priceMinor: 1_999_00 },
  ];
  for (const a of addons) {
    await prisma.addon.upsert({ where: { slug: a.slug }, update: {}, create: { ...a, currency: "INR" } });
  }

  // Demo accounts
  const password = await bcrypt.hash("password123", 12);
  const designer = await prisma.user.upsert({
    where: { email: "[email protected]" },
    update: {},
    create: { email: "[email protected]", name: "Dani Designer", passwordHash: password, role: "DESIGNER" },
  });
  const manager = await prisma.user.upsert({
    where: { email: "[email protected]" },
    update: {},
    create: { email: "[email protected]", name: "Mira Manager", passwordHash: password, role: "CLIENT_MANAGER" },
  });
  const client = await prisma.user.upsert({
    where: { email: "[email protected]" },
    update: {},
    create: { email: "[email protected]", name: "Carla Client", passwordHash: password, role: "CLIENT" },
  });
  const admin = await prisma.user.upsert({
    where: { email: "[email protected]" },
    update: {},
    create: { email: "[email protected]", name: "Admin", passwordHash: password, role: "ADMIN" },
  });

  console.log({ designer: designer.email, manager: manager.email, client: client.email, admin: admin.email });
  console.log("Seed complete. Default password: password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
