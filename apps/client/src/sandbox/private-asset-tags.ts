export const PRIVATE_ASSET_CANDIDATE_TAGS = [
  "preview-ok",
  "needs-scale-check",
  "too-heavy-for-browser",
  "character-reference-only",
  "prop-reference-only",
  "replace-before-public"
] as const;

export type PrivateAssetCandidateTag = (typeof PRIVATE_ASSET_CANDIDATE_TAGS)[number];

export type PrivateAssetCandidateTagDescription = Readonly<{
  description: string;
  publicRedistributionAllowed: boolean;
  requiresReplacement: boolean;
  tag: PrivateAssetCandidateTag;
}>;

export type PrivateAssetCandidateTagValidation = Readonly<{
  errors: readonly string[];
  ok: boolean;
}>;

export type PrivateAssetAuditTagInput = Readonly<{
  category: string;
  fileSizeBytes: number;
  meshCount: number;
  warnings: readonly string[];
}>;

const PRIVATE_ASSET_CANDIDATE_TAG_DESCRIPTIONS: Record<
  PrivateAssetCandidateTag,
  PrivateAssetCandidateTagDescription
> = {
  "preview-ok": {
    description: "Looks reasonable for local sandbox preview, subject to visual inspection.",
    publicRedistributionAllowed: false,
    requiresReplacement: false,
    tag: "preview-ok"
  },
  "needs-scale-check": {
    description: "Needs human scale/origin review before using as a prototype reference.",
    publicRedistributionAllowed: false,
    requiresReplacement: false,
    tag: "needs-scale-check"
  },
  "too-heavy-for-browser": {
    description: "Likely too large or complex for default browser preview paths.",
    publicRedistributionAllowed: false,
    requiresReplacement: true,
    tag: "too-heavy-for-browser"
  },
  "character-reference-only": {
    description: "Use only as a local character scale or rig reference.",
    publicRedistributionAllowed: false,
    requiresReplacement: true,
    tag: "character-reference-only"
  },
  "prop-reference-only": {
    description: "Use only as a local prop, cover, or dressing reference.",
    publicRedistributionAllowed: false,
    requiresReplacement: true,
    tag: "prop-reference-only"
  },
  "replace-before-public": {
    description: "Private prototype asset must be replaced before any public build or redistribution.",
    publicRedistributionAllowed: false,
    requiresReplacement: true,
    tag: "replace-before-public"
  }
};

export function describePrivateAssetCandidateTag(
  tag: PrivateAssetCandidateTag
): PrivateAssetCandidateTagDescription {
  return PRIVATE_ASSET_CANDIDATE_TAG_DESCRIPTIONS[tag];
}

export function validatePrivateAssetCandidateTags(
  tags: readonly string[]
): PrivateAssetCandidateTagValidation {
  const errors: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    if (seenTags.has(tag)) {
      errors.push(`Duplicate candidate tag: ${tag}`);
    }
    seenTags.add(tag);

    if (!isPrivateAssetCandidateTag(tag)) {
      errors.push(`Unknown candidate tag: ${tag}`);
    }
  }

  return {
    errors,
    ok: errors.length === 0
  };
}

export function suggestPrivateAssetCandidateTags(
  input: PrivateAssetAuditTagInput
): readonly PrivateAssetCandidateTag[] {
  const tags = new Set<PrivateAssetCandidateTag>(["replace-before-public"]);
  const warningSet = new Set(input.warnings);

  if (input.category === "characters-firstperson") {
    tags.add("character-reference-only");
  } else {
    tags.add("prop-reference-only");
  }

  if (warningSet.has("very-large-file")) {
    tags.add("too-heavy-for-browser");
  }

  if (
    warningSet.has("missing-scene-data") ||
    warningSet.has("unusual-scale-metadata") ||
    input.meshCount === 0
  ) {
    tags.add("needs-scale-check");
  }

  if (!tags.has("too-heavy-for-browser") && !tags.has("needs-scale-check")) {
    tags.add("preview-ok");
  }

  return PRIVATE_ASSET_CANDIDATE_TAGS.filter((tag) => tags.has(tag));
}

function isPrivateAssetCandidateTag(tag: string): tag is PrivateAssetCandidateTag {
  return PRIVATE_ASSET_CANDIDATE_TAGS.includes(tag as PrivateAssetCandidateTag);
}
