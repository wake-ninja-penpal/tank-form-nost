import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '../../config/gameConfig';

export interface UIBitmapTextOptions {
    text: string;
    fontSize?: number;
    anchor?: PIXI.Point;
    tint?: number;
}

/**
 * Компонент текстового поля на основе BitmapFont.
 * Использует предустановленный шрифт из ProceduralTextureFactory.
 */
export class UIBitmapText extends PIXI.BitmapText {
    constructor(options: UIBitmapTextOptions) {
        const fontName = GAME_CONFIG.ui.fontName;
        const fontSize = options.fontSize || 16;
        
        super(options.text, {
            fontFamily: fontName,
            fontSize: fontSize,
            align: 'center'
        });

        if (options.tint !== undefined) {
            this.tint = options.tint;
        }
        
        this.anchor.set(0.5);
    }

    public setText(text: string): void {
        this.text = text;
    }

    public destroy(options?: { children?: boolean; texture?: boolean }): void {
        super.destroy(options);
    }
}
