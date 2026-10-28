import truckAssetUrl from '../assets/lottie/Truck.lottie?url'
import logisticsAssetUrl from '../assets/lottie/Lottie.lottie?url'

export type LogisticsAnimationName =
  | 'truckMoving'
  | 'truckLoading'
  | 'truckUnloading'
  | 'containerShipping'
  | 'warehouseOperations'
  | 'cargoHandling'
  | 'deliverySuccess'
  | 'documentProcessing'
  | 'emptyState'
  | 'loading'

export type LogisticsAnimationScene =
  | 'truck'
  | 'cargo-loading'
  | 'cargo-unloading'
  | 'ship'
  | 'warehouse'
  | 'cargo'
  | 'success'
  | 'document'
  | 'empty'
  | 'loading'

export const animationFallbacks = {
  loading: 'static-placeholder',
  error: 'emptyState',
} as const

interface AnimationDefinition {
  scene: LogisticsAnimationScene
  assetUrl?: string
  description: string
  intendedUse: string
  width: number
  height: number
  animationType: 'dotlottie' | 'inline-svg-css'
  speed: number
  autoplay: boolean
  loop: boolean
  reducedMotion: 'static'
  fallback: 'emptyState'
  licenseNote: string
}

export const logisticsAnimations: Record<LogisticsAnimationName, AnimationDefinition> = {
  truckMoving: {
    scene: 'truck',
    assetUrl: truckAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'Dashboard logistics overview and job progress; not live vehicle tracking.',
    width: 176,
    height: 92,
    speed: 1,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  truckLoading: {
    scene: 'cargo-loading',
    assetUrl: truckAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'Truck loading context in haulage and warehouse workflows; not live activity.',
    width: 144,
    height: 92,
    speed: 0.9,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  truckUnloading: {
    scene: 'cargo-unloading',
    assetUrl: truckAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'Truck unloading context in haulage and warehouse workflows; not live activity.',
    width: 144,
    height: 92,
    speed: 0.9,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  containerShipping: {
    scene: 'ship',
    assetUrl: logisticsAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'Shipment transit context; the artwork is not a vessel or carrier position.',
    width: 144,
    height: 92,
    speed: 0.75,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  warehouseOperations: {
    scene: 'warehouse',
    assetUrl: logisticsAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'Warehouse context; the artwork does not represent live warehouse activity.',
    width: 144,
    height: 92,
    speed: 0.8,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  cargoHandling: {
    scene: 'cargo',
    assetUrl: logisticsAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'Cargo and inventory context; the artwork does not represent live stock activity.',
    width: 144,
    height: 92,
    speed: 0.85,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  deliverySuccess: {
    scene: 'success',
    assetUrl: logisticsAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'General logistics context; this artwork is not proof of delivery or payment.',
    width: 112,
    height: 92,
    speed: 1,
    autoplay: true,
    loop: false,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  documentProcessing: {
    scene: 'document',
    assetUrl: logisticsAssetUrl,
    description: 'User-provided 3D truck and freight illustration.',
    intendedUse: 'Document-workflow context; this artwork does not represent document processing status.',
    width: 112,
    height: 92,
    speed: 0.8,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'dotlottie',
    licenseNote: 'User-provided local asset; separate license metadata was not supplied.',
  },
  emptyState: {
    scene: 'empty',
    description: 'Illustrative empty logistics storage space.',
    intendedUse: 'Empty results and unconfigured reference data.',
    width: 112,
    height: 84,
    speed: 1,
    autoplay: false,
    loop: false,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'inline-svg-css',
    licenseNote: 'Original inline SVG/CSS fallback artwork.',
  },
  loading: {
    scene: 'loading',
    description: 'Illustrative rotating logistics loading indicator.',
    intendedUse: 'Non-blocking local data preparation feedback.',
    width: 48,
    height: 48,
    speed: 1,
    autoplay: true,
    loop: true,
    reducedMotion: 'static',
    fallback: 'emptyState',
    animationType: 'inline-svg-css',
    licenseNote: 'Original inline SVG/CSS fallback artwork.',
  },
}
