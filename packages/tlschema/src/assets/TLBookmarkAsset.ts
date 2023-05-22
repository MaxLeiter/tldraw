import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { createAssetValidator, TLBaseAsset } from './asset-validation'

// --- DEFINITION ---
/** @public */
export type TLBookmarkAsset = TLBaseAsset<
	'bookmark',
	{
		title: string
		description: string
		image: string
		src: string | null
	}
>

/** @public */
export const bookmarkAssetTypeValidator: T.Validator<TLBookmarkAsset> = createAssetValidator(
	'bookmark',
	T.object({
		title: T.string,
		description: T.string,
		image: T.string,
		src: T.string.nullable(),
	})
)

const Versions = {
	Initial: 0,
} as const

/** @public */
export const bookmarkAssetMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	currentVersion: Versions.Initial,
	migrators: {},
})
