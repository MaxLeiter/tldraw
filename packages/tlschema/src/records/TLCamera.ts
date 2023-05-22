import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { idValidator } from '../validation'

/**
 * TLCamera
 *
 * @public
 */
export interface TLCamera extends BaseRecord<'camera'> {
	x: number
	y: number
	z: number
}

/** @public */
export type TLCameraId = ID<TLCamera>

/** @public */
export const cameraTypeValidator: T.Validator<TLCamera> = T.model(
	'camera',
	T.object({
		typeName: T.literal('camera'),
		id: idValidator<TLCameraId>('camera'),
		x: T.number,
		y: T.number,
		z: T.number,
	})
)

const Versions = {
	Initial: 0,
} as const

/** @public */
export const cameraTypeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	currentVersion: Versions.Initial,
	migrators: {},
})

/** @public */
export const TLCamera = createRecordType<TLCamera>('camera', {
	migrations: cameraTypeMigrations,
	validator: cameraTypeValidator,
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLCamera, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		z: 1,
	})
)
