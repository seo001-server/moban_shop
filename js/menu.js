$(function () {
    // 树状菜单展开/折叠功能
    $('.tree-link').each(function () {
        const $parentItem = $(this).parent();

        // 检查是否有子菜单
        if ($parentItem.find('.subtree').length) {
            // 添加点击事件（排除内部<a>标签）
            $(this).on('click', function (e) {
                if ($(e.target).is('a')) return;
                $parentItem.toggleClass('expanded');
            });

            // 新增：检查子菜单是否有active项
            if ($parentItem.find('.subtree .active').length) {
                $parentItem.addClass('expanded');
            }
        }
    });

    // 页面加载时默认展开部分菜单
    $('.tree-item.expanded').each(function () {
        const $subtree = $(this).find('.subtree');
        if ($subtree.length) {
            $subtree.css('max-height', $subtree[0].scrollHeight + 'px');
        }
    });

    // 动画效果 - 卡片依次显示
    $('.fade-in').each(function (index) {
        $(this).css('animation-delay', index * 0.1 + 's');
    });
});