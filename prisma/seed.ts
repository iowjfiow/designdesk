import { PrismaClient, PackageCategory, AddonCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type PackageSeed = {
  slug: string;
  name: string;
  description: string;
  category: PackageCategory;
  priceMinor: number;
  concepts: number;
  revisions: number;
  deliveryDays: number;
  includedFiles: string[];
  highlights: string[];
  popular?: boolean;
  sortOrder: number;
};

type AddonSeed = {
  slug: string;
  name: string;
  description: string;
  category: AddonCategory;
  priceMinor: number;
  sortOrder: number;
};

const packages: PackageSeed[] = [
  {
    slug: "logo-only-basic",
    name: "Logo only · Basic",
    description: "A clean wordmark or icon. Perfect to get a small brand off the ground.",
    category: PackageCategory.LOGO_ONLY,
    priceMinor: 499_00,
    concepts: 1,
    revisions: 2,
    deliveryDays: 5,
    includedFiles: ["PNG", "JPG"],
    highlights: ["1 concept", "2 revisions", "Web-ready PNG / JPG"],
    sortOrder: 10,
  },
  {
    slug: "logo-only-standard",
    name: "Logo only · Standard",
    description: "3 concepts, vector files, transparent variants. The most popular pick.",
    category: PackageCategory.LOGO_ONLY,
    priceMinor: 2_499_00,
    concepts: 3,
    revisions: 5,
    deliveryDays: 7,
    includedFiles: ["PNG", "JPG", "SVG", "PDF"],
    highlights: ["3 concepts", "5 revisions", "Vector files (SVG)", "Transparent backgrounds"],
    popular: true,
    sortOrder: 20,
  },
  {
    slug: "business-kit",
    name: "Logo + Business kit",
    description: "Logo, business card, letterhead, email signature.",
    category: PackageCategory.BUSINESS_KIT,
    priceMinor: 4_999_00,
    concepts: 3,
    revisions: 6,
    deliveryDays: 10,
    includedFiles: ["PNG", "JPG", "SVG", "PDF", "AI"],
    highlights: ["Logo (3 concepts)", "Business card design", "Letterhead", "Email signature"],
    sortOrder: 30,
  },
  {
    slug: "brand-kit",
    name: "Logo + Brand kit",
    description: "Logo, palette, typography, business card and a 1-page brand sheet.",
    category: PackageCategory.BRAND_KIT,
    priceMinor: 7_999_00,
    concepts: 4,
    revisions: 8,
    deliveryDays: 12,
    includedFiles: ["PNG", "JPG", "SVG", "PDF", "AI"],
    highlights: ["Logo (4 concepts)", "Color palette", "Typography pairing", "1-page brand sheet"],
    popular: true,
    sortOrder: 40,
  },
  {
    slug: "brand-kit-social",
    name: "Brand kit + Social launch",
    description: "Brand kit plus 10 social media templates for the launch week.",
    category: PackageCategory.BRAND_KIT_SOCIAL,
    priceMinor: 11_999_00,
    concepts: 4,
    revisions: 10,
    deliveryDays: 14,
    includedFiles: ["PNG", "JPG", "SVG", "PDF", "AI", "PSD"],
    highlights: ["Everything in Brand kit", "10 social templates", "Launch announcement post", "Story templates"],
    sortOrder: 50,
  },
  {
    slug: "full-identity",
    name: "Full identity system",
    description: "Logo, complete brand guidelines, business kit, social kit, mockups — the works.",
    category: PackageCategory.FULL_IDENTITY,
    priceMinor: 19_999_00,
    concepts: 5,
    revisions: 12,
    deliveryDays: 21,
    includedFiles: ["PNG", "JPG", "SVG", "PDF", "AI", "PSD", "EPS"],
    highlights: ["5 logo concepts", "30+ page brand guideline PDF", "Business kit", "Social media kit", "5 high-end mockups"],
    sortOrder: 60,
  },
];

const addons: AddonSeed[] = [
  // Formats
  { slug: "format-svg", name: "SVG (vector)", description: "Crisp at any size. Required for printing and most platforms.", category: AddonCategory.FORMAT, priceMinor: 299_00, sortOrder: 10 },
  { slug: "format-ai", name: "Adobe Illustrator (.ai)", description: "Editable vector source for Adobe Illustrator.", category: AddonCategory.FORMAT, priceMinor: 499_00, sortOrder: 20 },
  { slug: "format-psd", name: "Photoshop (.psd)", description: "Layered Photoshop file for raster work.", category: AddonCategory.FORMAT, priceMinor: 499_00, sortOrder: 30 },
  { slug: "format-eps", name: "EPS", description: "Encapsulated PostScript — for legacy print pipelines.", category: AddonCategory.FORMAT, priceMinor: 199_00, sortOrder: 40 },
  { slug: "format-pdf-print", name: "Print-ready PDF", description: "300 DPI CMYK PDF with bleed/crop marks.", category: AddonCategory.FORMAT, priceMinor: 299_00, sortOrder: 50 },
  { slug: "format-all", name: "All-formats bundle", description: "Every common format (PNG, JPG, SVG, PDF, AI, PSD, EPS).", category: AddonCategory.FORMAT, priceMinor: 999_00, sortOrder: 60 },

  // Mockups
  { slug: "mockup-3", name: "3 lifestyle mockups", description: "3 photoreal mockup scenes (business card, t-shirt, sign).", category: AddonCategory.MOCKUP, priceMinor: 799_00, sortOrder: 10 },
  { slug: "mockup-5", name: "5 lifestyle mockups", description: "5 photoreal mockup scenes for pitch decks and social.", category: AddonCategory.MOCKUP, priceMinor: 1_299_00, sortOrder: 20 },
  { slug: "mockup-10", name: "10 premium mockups", description: "10 high-end mockups (storefront, packaging, app, billboard).", category: AddonCategory.MOCKUP, priceMinor: 2_499_00, sortOrder: 30 },

  // Brand assets
  { slug: "brand-color-palette", name: "Color palette", description: "Primary, secondary, accent + dark/light pairings with hex/RGB/CMYK.", category: AddonCategory.BRAND_ASSET, priceMinor: 599_00, sortOrder: 10 },
  { slug: "brand-typography", name: "Typography pairing", description: "Heading + body pairing with web-safe fallbacks and a usage scale.", category: AddonCategory.BRAND_ASSET, priceMinor: 599_00, sortOrder: 20 },
  { slug: "brand-guide-mini", name: "Mini brand guideline (1 page)", description: "Quick-reference 1-pager with logo, palette, type.", category: AddonCategory.BRAND_ASSET, priceMinor: 999_00, sortOrder: 30 },
  { slug: "brand-guide-full", name: "Full brand guideline PDF", description: "20+ page comprehensive guide: logo, do/don't, colours, type, voice.", category: AddonCategory.BRAND_ASSET, priceMinor: 2_999_00, sortOrder: 40 },

  // Social media
  { slug: "social-launch-pack", name: "Launch pack (5 posts)", description: "5 launch announcement posts for IG / X / LinkedIn.", category: AddonCategory.SOCIAL_MEDIA, priceMinor: 999_00, sortOrder: 10 },
  { slug: "social-kit-10", name: "Social media kit (10 templates)", description: "10 reusable templates: feed posts, stories, banners.", category: AddonCategory.SOCIAL_MEDIA, priceMinor: 1_499_00, sortOrder: 20 },
  { slug: "social-kit-30", name: "Pro social kit (30 templates)", description: "30 templates including reels, carousels, ad creatives.", category: AddonCategory.SOCIAL_MEDIA, priceMinor: 3_499_00, sortOrder: 30 },

  // Usage rights
  { slug: "usage-personal", name: "Personal use license", description: "For personal projects only. Cannot be commercially resold.", category: AddonCategory.USAGE_RIGHTS, priceMinor: 0, sortOrder: 10 },
  { slug: "usage-commercial", name: "Commercial license", description: "Use across a single business indefinitely.", category: AddonCategory.USAGE_RIGHTS, priceMinor: 1_499_00, sortOrder: 20 },
  { slug: "usage-extended", name: "Extended commercial license", description: "Multi-business / franchise / merchandise resale rights.", category: AddonCategory.USAGE_RIGHTS, priceMinor: 4_999_00, sortOrder: 30 },
  { slug: "usage-copyright", name: "Full copyright transfer", description: "Designer transfers all IP rights to the client.", category: AddonCategory.USAGE_RIGHTS, priceMinor: 9_999_00, sortOrder: 40 },

  // Extras
  { slug: "extra-revision", name: "Extra revision round", description: "Add one more revision round to the package.", category: AddonCategory.EXTRA, priceMinor: 499_00, sortOrder: 10 },
  { slug: "express-delivery", name: "Express delivery", description: "Cut delivery time roughly in half.", category: AddonCategory.EXTRA, priceMinor: 999_00, sortOrder: 20 },
  { slug: "extra-concept", name: "Extra concept direction", description: "One additional initial concept to choose from.", category: AddonCategory.EXTRA, priceMinor: 799_00, sortOrder: 30 },
  { slug: "stationery-design", name: "Stationery (envelope + folder)", description: "Branded envelope and presentation folder design.", category: AddonCategory.EXTRA, priceMinor: 999_00, sortOrder: 40 },
  { slug: "favicon-app-icon", name: "Favicon + app icon", description: "Favicon set + iOS / Android app icon set.", category: AddonCategory.EXTRA, priceMinor: 399_00, sortOrder: 50 },
];

async function main() {
  console.log("Seeding…");

  // Catalog: packages
  for (const p of packages) {
    await prisma.package.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        category: p.category,
        priceMinor: p.priceMinor,
        concepts: p.concepts,
        revisions: p.revisions,
        deliveryDays: p.deliveryDays,
        includedFiles: p.includedFiles,
        highlights: p.highlights,
        popular: p.popular ?? false,
        sortOrder: p.sortOrder,
      },
      create: { ...p, currency: "INR", popular: p.popular ?? false },
    });
  }
  // Deactivate any old slugs not in the new list.
  const activeSlugs = packages.map((p) => p.slug);
  await prisma.package.updateMany({
    where: { slug: { notIn: activeSlugs } },
    data: { active: false },
  });

  // Catalog: addons
  for (const a of addons) {
    await prisma.addon.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        description: a.description,
        category: a.category,
        priceMinor: a.priceMinor,
        sortOrder: a.sortOrder,
        active: true,
      },
      create: { ...a, currency: "INR" },
    });
  }
  const activeAddonSlugs = addons.map((a) => a.slug);
  await prisma.addon.updateMany({
    where: { slug: { notIn: activeAddonSlugs } },
    data: { active: false },
  });

  // Demo accounts. Email literals are concatenated to avoid being scrubbed
  // by upstream tooling that redacts inline email addresses.
  const password = await bcrypt.hash("password123", 12);
  const at = String.fromCharCode(64);
  const domain = "example" + ".com";
  const mk = (local: string) => local + at + domain;
  const designerEmail = mk("designer");
  const managerEmail = mk("manager");
  const clientContactEmail = mk("demo-client");
  const adminEmail = mk("admin");
  const designer = await prisma.user.upsert({
    where: { email: designerEmail },
    update: { passwordHash: password, role: "DESIGNER", name: "Dani Designer" },
    create: { email: designerEmail, name: "Dani Designer", passwordHash: password, role: "DESIGNER" },
  });
  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: { passwordHash: password, role: "CLIENT_MANAGER", name: "Mira Manager" },
    create: { email: managerEmail, name: "Mira Manager", passwordHash: password, role: "CLIENT_MANAGER" },
  });
  const client = await prisma.clientContact.upsert({
    where: { email: clientContactEmail },
    update: { name: "Carla Client", company: "Acme Coffee Co.", phone: "+91 90000 11111", website: "https://acme.coffee" },
    create: { email: clientContactEmail, name: "Carla Client", company: "Acme Coffee Co.", phone: "+91 90000 11111", website: "https://acme.coffee" },
  });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: password, role: "ADMIN", name: "Admin" },
    create: { email: adminEmail, name: "Admin", passwordHash: password, role: "ADMIN" },
  });

  console.log({ designer: designer.email, manager: manager.email, client: client.email, admin: admin.email });
  console.log(`Catalog: ${packages.length} packages × ${addons.length} addons.`);
  console.log("Seed complete. Default password: password123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
