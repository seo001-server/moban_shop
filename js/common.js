// 模板卡片悬停效果增强
document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
    });
});

// 返回顶部功能
const backToTopButton = document.getElementById('backToTop');

// 监听滚动事件
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopButton.classList.add('show');
    } else {
        backToTopButton.classList.remove('show');
    }
});

// 点击返回顶部
backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// 用户标识管理工具
const UserIdentifier = {
    /**
     * 获取或创建用户唯一标识
     * @returns {string} 8位用户标识
     */
    getOrCreateUserToken: () => {
        // 1. 尝试从localStorage获取
        let token = localStorage.getItem('userToken');

        // 2. 尝试从cookie获取
        if (!token) {
            token = UserIdentifier._getCookie('userToken');
            if (token) localStorage.setItem('userToken', token);
        }

        // 3. 生成新标识（如果都不存在）
        if (!token) {
            token = UserIdentifier._generateShortToken(8);
            localStorage.setItem('userToken', token);
            UserIdentifier._setCookie('userToken', token, 365);
        }

        return token;
    },

    /**
     * 验证是否为同一用户
     * @param {string} tokenToVerify 待验证的8位token
     * @returns {boolean} 验证结果
     */
    isSameUser: (tokenToVerify) => {
        if (!tokenToVerify || tokenToVerify.length !== 8) return false;

        // 多重验证机制
        const validations = [
            tokenToVerify === localStorage.getItem('userToken'),
            tokenToVerify === UserIdentifier._getCookie('userToken'),
            tokenToVerify === sessionStorage.getItem('sessionToken')
        ];

        // 任意两个验证通过即认为是同一用户
        return validations.filter(Boolean).length >= 2;
    },

    /**
     * 创建会话级临时令牌 (用于敏感操作)
     * @returns {string} 8位会话令牌
     */
    createSessionToken: () => {
        const token = UserIdentifier._generateShortToken(8);
        sessionStorage.setItem('sessionToken', token);
        return token;
    },

    // 生成指定长度的随机令牌 (大小写字母+数字)
    _generateShortToken: (length) => {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';

        // 添加密码学安全的随机字符
        if (window.crypto && window.crypto.getRandomValues) {
            const values = new Uint32Array(length);
            window.crypto.getRandomValues(values);
            for (let i = 0; i < length; i++) {
                token += charset[values[i] % charset.length];
            }
        }
        // 兼容不支持crypto的浏览器
        else {
            for (let i = 0; i < length; i++) {
                token += charset.charAt(Math.floor(Math.random() * charset.length));
            }
        }

        return token;
    },

    // Cookie操作辅助函数
    _getCookie: (name) => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [key, value] = cookie.trim().split('=');
            if (key === name) return decodeURIComponent(value);
        }
        return null;
    },

    _setCookie: (name, value, days) => {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
    }
}

// 公共dialog弹窗
function showDialog(title = '提示', content, confirmText = '确认', cancelText = '取消', isConfirm = false, isCancel = false, onClose = null) {
    const modal = document.getElementById('myModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');


    if (modal) {
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        modalConfirmBtn.textContent = confirmText == '' ? '确认' : confirmText;
        modalCancelBtn.textContent = cancelText == '' ? '取消' : cancelText;

        // 根据参数显示/隐藏按钮
        modalConfirmBtn.style.display = isConfirm ? 'inline-block' : 'none';
        modalCancelBtn.style.display = isCancel ? 'inline-block' : 'none';

        // 显示模态框
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 禁用滚动

        // 确认按钮事件
        modalConfirmBtn.onclick = function () {
            if (typeof onClose === 'function') onClose(true);
            modal.style.display = 'none';
            document.body.style.overflow = ''; // 恢复滚动
        }

        // 取消按钮事件
        modalCancelBtn.onclick = function () {
            if (typeof onClose === 'function') onClose(false);
            modal.style.display = 'none';
            document.body.style.overflow = ''; // 恢复滚动
        }
    }

}

// 公共alert弹窗
function showAlert(msg, iconClass = 'fa-info-circle', type = 'info', onClose = null) {
    const toast = document.getElementById('alertToast');
    const message = document.getElementById('alertMessage');
    const icon = toast.querySelector('.alert-icon');

    message.textContent = msg;
    icon.className = 'fas alert-icon ' + iconClass;

    toast.classList.add(type);
    toast.style.display = 'flex';

    clearTimeout(toast._timer);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    toast._timer = setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () {
            toast.style.display = 'none';
            if (typeof onClose === 'function') onClose();
        }, 300);
    }, 3000);
}

function showLoading(msg) {
    const load = document.getElementById('loader');
    const message = document.getElementById('loadingText');

    message.textContent = msg;
    load.style.display = 'flex';
}

function closeLoading() {
    const load = document.getElementById('loader');

    load.style.display = 'none';
}