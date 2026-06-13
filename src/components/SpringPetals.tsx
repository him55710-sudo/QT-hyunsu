import { useMemo } from 'react';

type PetalSeed = {
    id: number;
    left: number;
    delay: number;
    duration: number;
    swayDuration: number;
    spinDuration: number;
    size: number;
    opacity: number;
    drift: number;
    layer: 'front' | 'mid' | 'back';
};

type SpringPetalsVariant = 'background' | 'screen';

type SpringPetalsProps = {
    variant?: SpringPetalsVariant;
    className?: string;
};

type VariantConfig = {
    count: number;
    withHaze: boolean;
    opacityScale: number;
    driftBoost: number;
    sizeOffset: number;
    speedBoost: number;
};

const VARIANT_CONFIG: Record<SpringPetalsVariant, VariantConfig> = {
    background: {
        count: 26,
        withHaze: true,
        opacityScale: 1,
        driftBoost: 1,
        sizeOffset: 0,
        speedBoost: 1,
    },
    screen: {
        count: 18,
        withHaze: false,
        opacityScale: 0.78,
        driftBoost: 1.35,
        sizeOffset: 1.6,
        speedBoost: 1.15,
    },
};

const buildBackgroundLayer = (idx: number): PetalSeed['layer'] => {
    if (idx % 5 === 0) return 'front';
    if (idx % 3 === 0) return 'back';
    return 'mid';
};

const buildScreenLayer = (idx: number): PetalSeed['layer'] => {
    if (idx % 6 === 0) return 'back';
    if (idx % 2 === 0) return 'front';
    return 'mid';
};

const buildLayer = (idx: number, variant: SpringPetalsVariant): PetalSeed['layer'] => {
    if (variant === 'screen') return buildScreenLayer(idx);
    return buildBackgroundLayer(idx);
};

export default function SpringPetals({ variant = 'background', className = '' }: SpringPetalsProps) {
    const config = VARIANT_CONFIG[variant];

    const petals = useMemo<PetalSeed[]>(() => {
        return Array.from({ length: config.count }).map((_, idx) => {
            const layer = buildLayer(idx, variant);
            const ratio = idx / config.count;
            const baseSize = layer === 'front' ? 16 : layer === 'mid' ? 12 : 9;
            const leftJitter = ((idx * 37) % 11) - 5;
            const baseOpacity = layer === 'front' ? 0.8 : layer === 'mid' ? 0.55 : 0.35;
            const baseDrift = (idx % 2 === 0 ? 1 : -1) * (8 + (idx % 6) * 4);

            return {
                id: idx,
                left: 2 + ratio * 96 + leftJitter * 0.25,
                delay: -1 * (idx * 0.8),
                duration: (10 + (idx % 6) * 1.1 + (layer === 'back' ? 2.4 : 0)) / config.speedBoost,
                swayDuration: 2.8 + (idx % 5) * 0.45,
                spinDuration: 4.2 + (idx % 4) * 0.65,
                size: baseSize + (idx % 4) * 1.8 + config.sizeOffset,
                opacity: Math.min(0.95, baseOpacity * config.opacityScale),
                drift: baseDrift * config.driftBoost,
                layer,
            };
        });
    }, [config.count, config.driftBoost, config.opacityScale, config.sizeOffset, config.speedBoost, variant]);

    const containerClassName = ['pointer-events-none absolute inset-0 overflow-hidden', className]
        .filter(Boolean)
        .join(' ');

    return (
        <div aria-hidden className={containerClassName}>
            {config.withHaze && <div className="absolute inset-0 spring-blossom-haze" />}
            {petals.map((petal) => (
                <span
                    key={petal.id}
                    className={`spring-petal-track spring-petal-track-${petal.layer}`}
                    style={{
                        left: `${petal.left}%`,
                        top: '-14%',
                        opacity: petal.opacity,
                        animationDuration: `${petal.duration}s`,
                        animationDelay: `${petal.delay}s`,
                        ['--petal-drift' as string]: `${petal.drift}px`,
                        ['--petal-sway-duration' as string]: `${petal.swayDuration}s`,
                        ['--petal-spin-duration' as string]: `${petal.spinDuration}s`,
                    }}
                >
                    <span
                        className={`spring-petal spring-petal-${petal.layer}`}
                        style={{
                            width: `${petal.size}px`,
                            height: `${petal.size * 0.98}px`,
                        }}
                    />
                </span>
            ))}
        </div>
    );
}
