// 打字機效果實現
export class Typewriter {
    constructor(element, text, options = {}) {
        this.element = element;
        this.text = text;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        
        // 預設選項
        this.options = {
            typeSpeed: options.typeSpeed || 100,
            deleteSpeed: options.deleteSpeed || 50,
            waitTime: options.waitTime || 2000,
            loop: options.loop !== false,
            ...options
        };
        
        this.start();
    }
    
    start() {
        this.type();
    }
    
    type() {
        if (this.isDeleting) {
            // 刪除模式
            this.currentCharIndex--;
            this.element.textContent = this.text.substring(0, this.currentCharIndex);
            
            if (this.currentCharIndex === 0) {
                this.isDeleting = false;
                setTimeout(() => this.type(), 800);
                return;
            }
            
            setTimeout(() => this.type(), this.options.deleteSpeed);
        } else {
            // 打字模式
            this.currentCharIndex++;
            this.element.textContent = this.text.substring(0, this.currentCharIndex);
            
            if (this.currentCharIndex === this.text.length) {
                // 完成當前文字
                if (this.options.loop) {
                    setTimeout(() => {
                        this.isDeleting = true;
                        this.type();
                    }, this.options.waitTime);
                }
                return;
            }
            
            // 隨機化打字速度，使其更自然
            const randomDelay = this.options.typeSpeed + Math.random() * 30;
            setTimeout(() => this.type(), randomDelay);
        }
    }
} 