export type {
  WorktreeConfig,
  WorktreeConfigInput,
  WorktreeConfigOutput,
  WorktreeEntry as WorktreeMapping,
  WorktreeEntryInput as WorktreeMappingInput,
  WorktreeEntryOutput as WorktreeMappingOutput,
  WorktreeInfo,
  WorktreeInfoInput,
  WorktreeInfoOutput,
} from '@mdt/domain-contracts'

export {
  WorktreeConfigSchema,
  WorktreeInfoSchema,
  WorktreeEntrySchema as WorktreeMappingSchema,
  validateWorktreeConfig,
  validateWorktreeInfo,
  validateWorktreeEntry as validateWorktreeMapping,
} from '@mdt/domain-contracts'
