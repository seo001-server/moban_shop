// 简易购物车本地存储实现
function removeFromCart(id) {
    showDialog('提示', '是否将此模板从购物车中删除?', '', '', true, true, function (isConfirm) {
        if (isConfirm) {
            let cart = getCart();
            cart = cart.filter(item => item.id !== id);
            setCart(cart);
            renderCart();
            showAlert('删除成功!', 'fa-circle-check', 'success', function () {
                location.reload();
            })
        }
    });

}

function updateQty(id, qty) {
    let cart = getCart();
    cart = cart.map(item => {
        if (item.id === id) {
            item.qty = Math.max(1, Number(qty) || 1);
        }
        return item;
    });
    setCart(cart);
    renderCart();
}

// 数量加减
function changeQty(id, delta) {
    let cart = getCart();
    cart = cart.map(item => {
        if (item.id === id) {
            item.qty = Math.max(1, (item.qty || 1) + delta);
        }
        return item;
    });
    setCart(cart);
    renderCart();
}

// 数量输入
function changeQtyInput(id, val) {
    updateQty(id, val);
};

// 全选功能
$(document).on('change', '#select-all', function () {
    $('.cart-checkbox').prop('checked', this.checked);
});

// 单个checkbox变化时，控制全选状态和按钮显示
$(document).on('change', '.cart-checkbox', function () {
    const all = $('.cart-checkbox').length;
    const checked = $('.cart-checkbox:checked').length;
    $('#select-all').prop('checked', all === checked);
});

// 删除选中
function removeSelect() {
    const ids = $('.cart-checkbox:checked').map(function () { return $(this).val(); }).get();
    if (ids.length === 0) return;
    showDialog('提示', '确定删除选中的模板吗？', '确认', '取消', true, true, function (isConfirm) {
        if (isConfirm) {
            let cart = getCart();
            cart = cart.filter(item => !ids.includes(item.id));
            setCart(cart);
            renderCart();
            showAlert('删除成功!', 'fa-circle-check', 'success');
        }
    });
};
// 删除全部
function removeAll() {
    showDialog('提示', '确定清空购物车吗？', '确认', '取消', true, true, function (isConfirm) {
        if (isConfirm) {
            setCart([]);
            renderCart();
            showAlert('购物车已清空!', 'fa-circle-check', 'success');
        }
    });
};

// 结算按钮
$(function () {
    renderCart();
});