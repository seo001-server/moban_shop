// 标签页切换
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', function () {
        // 移除所有按钮的active类
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 为当前点击的按钮添加active类
        this.classList.add('active');

        // 隐藏所有内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 显示对应内容
        const tabId = this.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// 设备切换
document.querySelectorAll('.device-btn').forEach(button => {
    button.addEventListener('click', function () {
        // 移除所有按钮的active类
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 为当前点击的按钮添加active类
        this.classList.add('active');
    });
});

// 缩略图点击
document.querySelectorAll('.thumb-item').forEach(thumb => {
    thumb.addEventListener('click', function () {
        // 移除所有缩略图的active类
        document.querySelectorAll('.thumb-item').forEach(t => {
            t.classList.remove('active');
        });

        // 为当前点击的缩略图添加active类
        this.classList.add('active');
    });
});

// 授权选项选择
document.querySelectorAll('.domain-option').forEach(option => {
    option.addEventListener('click', function () {
        // 移除所有选项的selected类
        document.querySelectorAll('.domain-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // 为当前点击的选项添加selected类
        this.classList.add('selected');
    });
});

