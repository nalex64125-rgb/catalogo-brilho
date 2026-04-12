// -------- CONFIGURATION --------
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx20ZnNP98AaZageJqz_oOCNtBjXZg7OzouKtQNKAQeP-hk0k-hmTLC758hY2cCNyor/exec";
const ADMIN_PASS = "1234";
const BUSINESS_PHONE = "584120000000"; // format without +

// -------- STATE --------
let products = [];
let cart = [];
let currentDept = 'all';
let currentCat = 'all';
let isFirstLoad = true;

// -------- DOM ELEMENTS --------
const els = {
    // Navigation
    navbar: document.getElementById('navbar'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileDrawer: document.getElementById('mobileDrawer'),
    closeMobileDrawer: document.getElementById('closeMobileDrawer'),
    mobileOverlay: document.getElementById('mobileOverlay'),
    mobileCategories: document.getElementById('mobileCategories'),
    categoryRibbon: document.getElementById('categoryRibbon'),
    
    // Grids
    productGrid: document.getElementById('productGrid'),
    adminProductGrid: document.getElementById('adminProductGrid'),
    
    // Cart
    cartBtn: document.getElementById('cartBtn'),
    cartSidebar: document.getElementById('cartSidebar'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartOverlay: document.getElementById('cartOverlay'),
    cartItems: document.getElementById('cartItems'),
    cartCount: document.getElementById('cartCount'),
    cartTotal: document.getElementById('cartTotal'),
    
    // Checkout
    checkoutBtn: document.getElementById('checkoutBtn'),
    checkoutModal: document.getElementById('checkoutModal'),
    modalOverlayCheckout: document.getElementById('modalOverlayCheckout'),
    cancelCheckout: document.getElementById('cancelCheckout'),
    checkoutForm: document.getElementById('checkoutForm'),
    
    // Admin Login
    adminLoginBtn: document.getElementById('adminLoginBtn'),
    loginModal: document.getElementById('loginModal'),
    modalOverlayLogin: document.getElementById('modalOverlayLogin'),
    cancelLogin: document.getElementById('cancelLogin'),
    confirmLogin: document.getElementById('confirmLogin'),
    adminPassInput: document.getElementById('adminPassInput'),
    
    // Admin Panel
    adminPanel: document.getElementById('adminPanel'),
    modalOverlayAdmin: document.getElementById('modalOverlayAdmin'),
    closeAdminBtn: document.getElementById('closeAdminBtn'),
    productForm: document.getElementById('productForm'),
    adminStatus: document.getElementById('adminStatus'),
    saveProductBtn: document.getElementById('saveProductBtn'),
};

// -------- INITIALIZATION --------
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadProducts();
    // Auto-refresh products every 45s
    setInterval(loadProducts, 45000);
});

// -------- EVENT LISTENERS --------
function initEvents() {
    // Scroll behavior for Navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) els.navbar.style.background = 'rgba(10, 10, 10, 0.95)';
        else els.navbar.style.background = 'rgba(20, 20, 20, 0.85)';
    });

    // Mobile Drawer
    els.mobileMenuBtn.addEventListener('click', () => toggleMobileDrawer(true));
    els.closeMobileDrawer.addEventListener('click', () => toggleMobileDrawer(false));
    els.mobileOverlay.addEventListener('click', () => toggleMobileDrawer(false));

    // Cart Sidebar
    els.cartBtn.addEventListener('click', () => toggleCart(true));
    els.closeCartBtn.addEventListener('click', () => toggleCart(false));
    els.cartOverlay.addEventListener('click', () => toggleCart(false));

    // Checkout Modal
    els.checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        toggleCart(false);
        toggleModal(els.checkoutModal, els.modalOverlayCheckout, true);
    });
    els.cancelCheckout.addEventListener('click', () => toggleModal(els.checkoutModal, els.modalOverlayCheckout, false));
    els.modalOverlayCheckout.addEventListener('click', () => toggleModal(els.checkoutModal, els.modalOverlayCheckout, false));
    els.checkoutForm.addEventListener('submit', handleOrderSubmit);

    // Admin Login Modal
    els.adminLoginBtn.addEventListener('click', () => toggleModal(els.loginModal, els.modalOverlayLogin, true));
    els.cancelLogin.addEventListener('click', () => toggleModal(els.loginModal, els.modalOverlayLogin, false));
    els.modalOverlayLogin.addEventListener('click', () => toggleModal(els.loginModal, els.modalOverlayLogin, false));
    els.confirmLogin.addEventListener('click', handleLogin);
    els.adminPassInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

    // Admin Panel
    els.closeAdminBtn.addEventListener('click', () => toggleModal(els.adminPanel, els.modalOverlayAdmin, false));
    els.modalOverlayAdmin.addEventListener('click', () => toggleModal(els.adminPanel, els.modalOverlayAdmin, false));
    els.productForm.addEventListener('submit', handleAddProduct);
}

// -------- TOGGLE UTILS --------
function toggleMobileDrawer(show) {
    els.mobileDrawer.classList.toggle('open', show);
    els.mobileOverlay.classList.toggle('active', show);
}

function toggleCart(show) {
    els.cartSidebar.classList.toggle('open', show);
    els.cartOverlay.classList.toggle('active', show);
}

function toggleModal(modalEl, overlayEl, show) {
    if (show) {
        modalEl.classList.add('open');
        overlayEl.classList.add('active');
        if (modalEl === els.loginModal) els.adminPassInput.focus();
    } else {
        modalEl.classList.remove('open');
        overlayEl.classList.remove('active');
    }
}

// -------- DATA FETCHING --------
async function loadProducts() {
    try {
        const response = await fetch(`${WEB_APP_URL}?t=${Date.now()}`);
        const data = await response.json();
        
        // Deep compare to avoid unnecessary re-renders
        if (JSON.stringify(products) !== JSON.stringify(data) || isFirstLoad) {
            products = data;
            isFirstLoad = false;
            renderCategories();
            filterBy(encodeURIComponent(currentDept), encodeURIComponent(currentCat)); // Re-apply current filter
            if (els.adminPanel.classList.contains('open')) renderAdminList();
        }
    } catch (e) {
        console.error("Load error:", e);
        if (products.length === 0) {
            els.productGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:4rem;">Error conectando a la base de datos. Verifica tu conexión.</div>`;
        }
    }
}

// -------- RENDER UI --------
function renderCategories() {
    const depts = [...new Set(products.map(p => p.dept).filter(Boolean))];
    
    // Ribbon Desktop/Tablet
    let ribbonHtml = `<button class="cat-btn ${currentDept === 'all' ? 'active' : ''}" onclick="filterBy('all', 'all')">Todos</button>`;
    
    // Mobile Drawer
    let mobileHtml = `<div class="mobile-cat-header ${currentDept === 'all' ? 'text-primary' : ''}" style="cursor:pointer;" onclick="filterBy('all', 'all'); toggleMobileDrawer(false);">Todos</div>`;

    depts.forEach(d => {
        const categories = [...new Set(products.filter(p => p.dept === d).map(p => p.cat).filter(Boolean))];
        const dEnc = encodeURIComponent(d);
        
        if (categories.length > 0) {
            ribbonHtml += `
            <div class="cat-dropdown">
                <button class="cat-btn ${currentDept === d ? 'active' : ''}" onclick="filterBy('${dEnc}', 'all')">${d} ▾</button>
                <div class="dropdown-menu">
                    ${categories.map(c => `<div class="dropdown-item ${currentCat === c ? 'active' : ''}" onclick="filterBy('${dEnc}', '${encodeURIComponent(c)}')">${c}</div>`).join('')}
                </div>
            </div>`;
            
            mobileHtml += `
            <div class="mobile-cat-group">
                <div class="mobile-cat-header ${currentDept === d ? 'text-primary' : ''}">
                    <span onclick="filterBy('${dEnc}', 'all'); toggleMobileDrawer(false);" style="flex-grow:1; cursor:pointer;">${d}</span>
                    <button class="mobile-expander" onclick="toggleMobileSubmenu(this)">▾</button>
                </div>
                <div class="mobile-subcat">
                    ${categories.map(c => `<div class="mobile-cat-link" onclick="filterBy('${dEnc}', '${encodeURIComponent(c)}'); toggleMobileDrawer(false);" style="padding: 0.5rem 0; cursor:pointer; ${currentCat === c ? 'color: var(--primary); font-weight: bold;' : ''}">${c}</div>`).join('')}
                </div>
            </div>`;
        } else {
            ribbonHtml += `<button class="cat-btn ${currentDept === d ? 'active' : ''}" onclick="filterBy('${dEnc}', 'all')">${d}</button>`;
            
            mobileHtml += `
            <div class="mobile-cat-header ${currentDept === d ? 'text-primary' : ''}" style="cursor:pointer;" onclick="filterBy('${dEnc}', 'all'); toggleMobileDrawer(false);">
                 ${d}
            </div>`;
        }
    });

    els.categoryRibbon.innerHTML = ribbonHtml;
    els.mobileCategories.innerHTML = mobileHtml;
}

window.toggleMobileSubmenu = function(btn) {
    if(window.event && window.event.type === 'click') window.event.preventDefault();
    const subcat = btn.parentElement.nextElementSibling;
    if(subcat) subcat.classList.toggle('open');
}

window.filterBy = function(deptEnc, catEnc) {
    if(window.event && window.event.type === 'click') window.event.preventDefault();
    
    const dept = deptEnc === 'all' ? 'all' : decodeURIComponent(deptEnc);
    const cat = catEnc === 'all' ? 'all' : decodeURIComponent(catEnc);
    
    currentDept = dept;
    currentCat = cat;
    renderCategories(); // update active state on buttons

    let filtered = products;
    if (dept !== 'all') {
        filtered = filtered.filter(p => p.dept === dept);
    }
    if (cat !== 'all') {
        filtered = filtered.filter(p => p.cat === cat);
    }
    
    renderProducts(filtered);
}

function renderProducts(items) {
    if (!items || items.length === 0) {
        els.productGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 4rem; color: var(--gray-400);">No se encontraron productos en esta categoría.</div>';
        return;
    }
    
    els.productGrid.innerHTML = items.map(p => `
        <div class="product-card">
            <img src="${p.img || 'assets/logo_empresa.png'}" alt="${p.name}" class="product-img" loading="lazy" onerror="this.src='assets/logo_empresa.png'">
            <div class="product-info">
                <span class="product-tag">${p.dept || 'Genérico'} ${p.cat ? '| '+p.cat : ''}</span>
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">Ref: ${p.ref || 'N/A'}</p>
                <div class="product-footer">
                    <span class="product-price">$${formatPrice(p.price)}</span>
                    <button onclick="addToCart('${p.id}')" class="btn btn-primary" style="padding: 0.5rem 1rem;">Añadir</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderAdminList() {
    els.adminProductGrid.innerHTML = products.map(p => `
        <div class="admin-prod-item">
            <div style="flex-grow:1; display:flex; align-items:center; gap:10px;">
                <img src="${p.img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; background:#000;">
                <div>
                   <div style="font-weight:600; font-size:0.95rem;">${p.name}</div>
                   <div style="font-size:0.8rem; color:var(--gray-400);">Ref: ${p.ref} - $${formatPrice(p.price)}</div>
                </div>
            </div>
            <button onclick="deleteProduct('${p.id}')" class="icon-btn" style="color:var(--danger); padding:8px;" title="Eliminar">✕</button>
        </div>
    `).join('');
}

// -------- CART LOGIC --------
window.addToCart = function(pid) {
    const p = products.find(i => String(i.id) === String(pid));
    if (!p) return;
    
    const exist = cart.find(i => String(i.id) === String(pid));
    if (exist) {
        exist.quantity++;
    } else {
        cart.push({...p, quantity: 1});
    }
    
    updateCartUI();
    toggleCart(true);
}

window.changeQty = function(pid, delta) {
    const item = cart.find(c => String(c.id) === String(pid));
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(c => String(c.id) !== String(pid));
    }
    updateCartUI();
}

function updateCartUI() {
    const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);
    els.cartCount.innerText = totalItems;
    
    if (cart.length === 0) {
        els.cartItems.innerHTML = '<div style="text-align:center; color:var(--gray-400); margin-top: 2rem;">Tu carrito está vacío</div>';
        els.cartTotal.innerText = '$0';
        return;
    }

    els.cartItems.innerHTML = cart.map(i => `
        <div class="cart-item">
            <img src="${i.img || 'assets/logo_empresa.png'}">
            <div class="cart-item-info">
                <h4>${i.name}</h4>
                <p>$${formatPrice(i.price)}</p>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty('${i.id}', -1)">−</button>
                <span style="font-weight:bold; min-width: 20px; text-align:center;">${i.quantity}</span>
                <button class="qty-btn" onclick="changeQty('${i.id}', 1)">+</button>
            </div>
        </div>
    `).join('');
    
    const t = cart.reduce((s, i) => s + (parsePrice(i.price) * i.quantity), 0);
    els.cartTotal.innerText = `$${formatPrice(t)}`;
}

// -------- ORDER CHECKOUT --------
function handleOrderSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const addr = document.getElementById('custAddr').value.trim();
    const total = cart.reduce((s, i) => s + (parsePrice(i.price) * i.quantity), 0);
    
    let msg = `*NUEVO PEDIDO - CATÁLOGO PREMIUM*\n\n`;
    msg += `*Cliente:* ${name}\n`;
    msg += `*Teléfono:* ${phone}\n`;
    msg += `*Dirección:* ${addr}\n\n`;
    msg += `*Resumen de compra:*\n`;
    cart.forEach(i => {
        msg += `- ${i.name} (Ref: ${i.ref || 'N/A'}) x${i.quantity} = $${formatPrice(parsePrice(i.price) * i.quantity)}\n`;
    });
    msg += `\n*TOTAL A PAGAR:* $${formatPrice(total)}`;

    const encodedMsg = encodeURIComponent(msg);
    const waLink = `https://wa.me/${BUSINESS_PHONE}?text=${encodedMsg}`;
    
    window.open(waLink, '_blank');
    
    // Clear state
    cart = [];
    updateCartUI();
    els.checkoutForm.reset();
    toggleModal(els.checkoutModal, els.modalOverlayCheckout, false);
}

// -------- ADMIN FEATURES --------
function handleLogin() {
    if (els.adminPassInput.value === ADMIN_PASS) {
        toggleModal(els.loginModal, els.modalOverlayLogin, false);
        els.adminPassInput.value = '';
        renderAdminList();
        toggleModal(els.adminPanel, els.modalOverlayAdmin, true);
    } else {
        alert("Contraseña incorrecta");
        els.adminPassInput.value = '';
        els.adminPassInput.focus();
    }
}

// IMAGE COMPRESSOR (Ultra-light for Google Sheets 50k char limit)
function compressImage(file, maxDist = 400) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxDist) { height *= maxDist / width; width = maxDist; }
                } else {
                    if (height > maxDist) { width *= maxDist / height; height = maxDist; }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to WebP at 0.5 quality for maximum lightness
                const compressedBase64 = canvas.toDataURL('image/webp', 0.5);
                resolve(compressedBase64);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

async function handleAddProduct(e) {
    e.preventDefault();
    const fileInput = document.getElementById('pFile');
    const file = fileInput.files[0];
    
    if (!file) {
        els.adminStatus.innerText = "❌ Debes añadir una foto";
        return;
    }
    
    els.saveProductBtn.disabled = true;
    els.adminStatus.innerText = "⏳ Optimizando imagen...";

    try {
        const compressedBase64 = await compressImage(file, 400); // 400px max
        
        if (compressedBase64.length > 45000) {
            els.adminStatus.innerText = "❌ La imagen es muy compleja/grande. Usa otra foto.";
            els.saveProductBtn.disabled = false;
            return;
        }

        const payload = {
            name: document.getElementById('pName').value.trim(),
            ref: document.getElementById('pRef').value.trim(),
            price: document.getElementById('pPrice').value,
            dept: document.getElementById('pDept').value.trim(),
            cat: document.getElementById('pCategory').value.trim(),
            desc: document.getElementById('pDesc').value.trim(),
            img: compressedBase64
        };
        
        els.adminStatus.innerText = "🚀 Enviando a Google Sheets...";
        
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        
        els.adminStatus.innerText = "✅ Producto agregado correctamente";
        
        setTimeout(() => {
            els.productForm.reset();
            els.adminStatus.innerText = "";
            els.saveProductBtn.disabled = false;
            loadProducts();
        }, 1500);
        
    } catch (err) {
        console.error(err);
        els.adminStatus.innerText = "❌ Ocurrió un error al procesar/subir";
        els.saveProductBtn.disabled = false;
    }
}

window.deleteProduct = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'DELETE', id: id })
        });
        // Optimistic delete
        products = products.filter(p => String(p.id) !== String(id));
        renderAdminList();
        renderCategories();
        filterBy(currentCategory);
        
        // Refresh silently
        loadProducts();
    } catch (e) {
        alert("Error al intentar eliminar. Revisa tu conexión.");
    }
}

// -------- UTILS --------
function formatPrice(p) { 
    const n = parsePrice(p); 
    return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, {minimumFractionDigits:1}); 
}
function parsePrice(p) { 
    return parseFloat(String(p).replace(/[$\s]/g, '').replace(',', '.')) || 0; 
}
