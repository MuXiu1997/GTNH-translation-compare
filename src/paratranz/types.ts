import { z } from 'zod'
import { TARGET_LANGUAGES } from '~/filetypes/language.ts'

export const FileSchema = z.object({
  id: z.number(),
  modifiedAt: z.string().nullish(),
  name: z.string(),
  extra: z.record(z.string(), z.any()).nullish(),
}).catchall(z.unknown())

export type File = z.infer<typeof FileSchema>

export const StringItemSchema = z.object({
  id: z.number().nullish(),
  key: z.string(),
  original: z.string(),
  translation: z.string().default(''),
  context: z.string().nullish(),
  stage: z.number().nullish(),
})

export type StringItem = z.infer<typeof StringItemSchema>

export const StringPageSchema = z.object({
  pageCount: z.number(),
  results: z.array(StringItemSchema),
}).catchall(z.unknown())

export type StringPage = z.infer<typeof StringPageSchema>

export const PropertySchema = z.object({
  key: z.string(),
  start: z.number(),
  end: z.number(),
})

export type Property = z.infer<typeof PropertySchema>

export const FileExtraSchema = z.object({
  original: z.string(),
  properties: z.record(z.string(), PropertySchema),
  enUsRelpath: z.string().nullish(),
  targetRelpath: z.string().optional(),
  newlines: z.unknown().optional(),
}).catchall(z.unknown()).transform((data) => {
  const { targetRelpath: inputTargetRelpath, enUsRelpath: inputEnUsRelpath, ...rest } = data
  let targetRelpath = inputTargetRelpath
  let enUsRelpath = inputEnUsRelpath

  if ('target_relpath' in rest && !targetRelpath) {
    targetRelpath = (rest as any).target_relpath
    delete (rest as any).target_relpath
  }
  if ('en_us_relpath' in rest && !enUsRelpath) {
    enUsRelpath = (rest as any).en_us_relpath
    delete (rest as any).en_us_relpath
  }

  for (const lang of TARGET_LANGUAGES) {
    const legacyKey = `${lang.toLowerCase()}_relpath`
    if (legacyKey in rest) {
      if (!targetRelpath) {
        targetRelpath = (rest as any)[legacyKey]
      }
      delete (rest as any)[legacyKey]
      console.warn(`FileExtra.${legacyKey} is deprecated, use FileExtra.targetRelpath instead`)
    }
  }

  return {
    ...rest,
    enUsRelpath: enUsRelpath ?? '',
    targetRelpath: targetRelpath ?? '',
  }
})

export type FileExtra = z.infer<typeof FileExtraSchema>

export const ParatranzFileSchema = z.object({
  fileName: z.string(),
  fileExtra: FileExtraSchema,
  stringItems: z.array(StringItemSchema),
})

export type ParatranzFile = z.infer<typeof ParatranzFileSchema>

export const TranslationFileSchema = z.object({
  name: z.string(),
  relpath: z.string(),
  content: z.string(),
})

export type TranslationFile = z.infer<typeof TranslationFileSchema>
