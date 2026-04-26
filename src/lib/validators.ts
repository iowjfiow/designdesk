import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(["DESIGNER", "CLIENT_MANAGER"]).default("DESIGNER"),
});

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export const CreateProjectSchema = z.object({
  title: z.string().min(2).max(200),
  briefMd: z.string().max(20_000).optional(),
  mode: z.enum(["SOLO", "COLLAB"]),
  clientEmail: z.string().email(),
  clientName: z.string().min(1).max(120).optional(),
  managerEmail: z.string().email().optional(),
  packageId: z.string().min(1),
  addonIds: z.array(z.string()).default([]),
  taxBps: z.number().int().min(0).max(10_000).default(0),
  designerBps: z.number().int().min(0).max(10_000).optional(),
  managerBps: z.number().int().min(0).max(10_000).optional(),
  customQuote: z.boolean().default(false),
  customNotes: z.string().max(5_000).optional(),
  customAmountMinor: z.number().int().min(0).max(1_000_000_000).optional(),
});

export const ApproveScopeSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const SendMessageSchema = z.object({
  body: z.string().min(1).max(8000),
});

export const RaiseDisputeSchema = z.object({
  reason: z.string().min(10).max(2000),
});

export const SubmitMilestoneSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const RejectMilestoneSchema = z.object({
  reason: z.string().min(3).max(2000),
});

export const PublicOrderSchema = z.object({
  title: z.string().min(2).max(200),
  briefMd: z.string().max(20_000).optional(),
  clientEmail: z.string().email(),
  clientName: z.string().min(1).max(120).optional(),
  clientCompany: z.string().max(200).optional(),
  clientPhone: z.string().max(60).optional(),
  clientWebsite: z.string().max(500).optional(),
  packageId: z.string().min(1),
  addonIds: z.array(z.string()).default([]),
  taxBps: z.number().int().min(0).max(10_000).default(1800),
  deadline: z.string().optional(),
  budgetMinor: z.number().int().min(0).max(1_000_000_000).optional(),
  references: z.array(z.string().max(500)).max(20).default([]),
});

export const ReviewSchema = z.object({
  kind: z.enum(["MILESTONE", "FINAL"]),
  milestoneId: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(4000),
});

export const ClaimProjectSchema = z.object({
  managerEmail: z.string().email().optional(), // when designer claims and wants to assign manager
  designerEmail: z.string().email().optional(), // when manager claims and wants to assign designer
});
