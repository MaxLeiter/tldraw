import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLOpacityType } from '../style-types'
import { opacityValidator } from '../validation'
import { createShapeValidator, TLBaseShape } from './shape-validation'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

/** @public */
export const groupShapeTypeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object({
		opacity: opacityValidator,
	})
)

const Versions = {
	Initial: 0,
} as const

/** @public */
export const groupShapeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	currentVersion: Versions.Initial,
	migrators: {},
})
