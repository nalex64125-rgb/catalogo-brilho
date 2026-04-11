// Configuration
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyCHryfeKiZeQ1FHCCEez6GQoqbpK_-X2jT2W34hr1arfupjVlQU4K2jdEod-Be-CMh/exec";
const ADMIN_PASS = "1234";
const businessPhone = "584120000000"; 

// State
let products = [];
let cart = [];

// DOM Elements
const productGrid = document.getElementById('productGrid');
const adminPanel = document.getElementById('adminPanel');
const productForm = document.getElementById('productForm');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const loginModal = document.getElementById('loginModal');
const adminPassInput = document.getElementById('adminPassInput');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
    setInterval(loadProducts, 30000); 
});

function setupEventListeners() {
    document.getElementById('cartBtn').addEventListener('click', () => toggleCart(true));
    document.getElementById('closeCart').addEventListener('click', () => toggleCart(false));
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        toggleCart(false);
        toggleModal(true);
    });
    document.getElementById('cancelCheckout').addEventListener('click', () => toggleModal(false));
    document.getElementById('checkoutForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleOrder();
    });
    
    adminLoginBtn.addEventListener('click', () => toggleLoginModal(true));
    document.getElementById('closeAdmin').addEventListener('click', () => toggleAdminPanel(false));
    productForm.addEventListener('submit', handleAddProduct);
    
    document.getElementById('confirmLogin').addEventListener('click', handleLogin);
    document.getElementById('cancelLogin').addEventListener('click', () => toggleLoginModal(false));
    
    window.addEventListener('scroll', handleHeaderScroll);
}

async function loadProducts() {
    try {
        const response = await fetch(`${WEB_APP_URL}?t=${Date.now()}`);
        const data = await response.json();
        if (JSON.stringify(products) !== JSON.stringify(data)) {
            products = data;
            renderProducts(products);
            renderSidebar();
            if (adminPanel.style.display === 'block') renderAdminProducts();
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

function handleAddProduct(e) {
    e.preventDefault();
    const btn = productForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Procesando...";

    const file = document.getElementById('pFile').files[0];
    if (!file) {
        alert("Selecciona una foto");
        btn.disabled = false;
        btn.innerText = "Guardar";
        return;
    }

    const reader = new FileReader();
    reader.onerror = () => alert("Error al leer el archivo");
    reader.onload = async (event) => {
        const base64 = event.target.result;
        
        const payload = {
            name: document.getElementById('pName').value,
            ref: document.getElementById('pRef').value,
            price: document.getElementById('pPrice').value,
            dept: document.getElementById('pDept').value,
            cat: document.getElementById('pCategory').value,
            img: base64,
            desc: document.getElementById('pDesc').value
        };

        alert("¡Foto preparada! Enviando a Google Sheets...");

        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });
            alert("¡ÉXITO! Producto guardado. Espera unos segundos y aparecerá.");
            productForm.reset();
            toggleAdminPanel(false);
            loadProducts();
        } catch (err) {
            alert("Error de conexión: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = "Guardar";
        }
    };
    reader.readAsDataURL(file);
}

async function deleteProduct(id) {
    if (!confirm('¿Eliminar producto?')) return;
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'DELETE', id: id })
        });
        alert("Eliminado. Recargando...");
        loadProducts();
    } catch (e) { alert("Error"); }
}

function renderProducts(items) {
    const grid = document.getElementById('productGrid');
    if (!items || items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 5rem;">El catálogo está vacío. ¡Añade tu primer producto!</p>';
        return;
    }
    grid.innerHTML = items.map(p => `
        <div class="product-card glass">
            <img src="${p.img}" alt="${p.name}" class="product-image">
            <div class="product-info">
                <span class="product-tag">${p.dept} | ${p.cat}</span>
                <p style="font-size: 0.7rem; color: var(--text-muted);">Ref: ${p.ref}</p>
                <h3 class="product-name">${p.name}</h3>
                <p class="product-price">$${formatPrice(p.price)}</p>
                <button onclick="addToCart('${p.id}')" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Agregar</button>
            </div>
        </div>
    `).join('');
}

function renderSidebar() {
    const deptList = document.getElementById('deptList');
    const depts = [...new Set(products.map(p => p.dept).filter(Boolean))];
    let html = `<li><a href="#" onclick="filterBy('all')">Todos</a></li>`;
    depts.forEach(d => {
        const cats = [...new Set(products.filter(p => p.dept === d).map(p => p.cat).filter(Boolean))];
        html += `<li class="has-submenu"><a href="#" onclick="toggleSubmenu(event)">${d} ▾</a><ul class="submenu">${cats.map(c => `<li><a href="#" onclick="filterBy('${c}', '${d}')">${c}</a></li>`).join('')}</ul></li>`;
    });
    deptList.innerHTML = html;
}

function renderAdminProducts() {
    const grid = document.getElementById('adminProductGrid');
    grid.innerHTML = products.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--glass-border);">
            <span>${p.name}</span>
            <button onclick="deleteProduct('${p.id}')" style="color:#ff4444; background:none; border:1px solid #ff4444; padding:2px 8px; cursor:pointer;">Borrar</button>
        </div>
    `).join('');
}

function addToCart(pid) {
    const p = products.find(i => String(i.id) === String(pid));
    if (!p) return;
    const ex = cart.find(i => String(i.id) === String(pid));
    if (ex) ex.quantity++; else cart.push({...p, quantity: 1});
    updateCartUI();
    toggleCart(true);
}

function changeQuantity(pid, delta) {
    const i = cart.find(c => String(c.id) === String(pid));
    if (!i) return;
    i.quantity += delta;
    if (i.quantity <= 0) cart = cart.filter(c => String(c.id) !== String(pid));
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cartCount').innerText = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('cartItems').innerHTML = cart.map(i => `<div class="cart-item"><img src="${i.img}"><div><h4>${i.name}</h4><p>$${formatPrice(i.price)} x ${i.quantity}</p></div><button onclick="changeQuantity('${i.id}', -1)">-</button><button onclick="changeQuantity('${i.id}', 1)">+</button></div>`).join('');
    const t = cart.reduce((s, i) => s + (parsePrice(i.price) * i.quantity), 0);
    document.getElementById('cartTotal').innerText = `$${t.toLocaleString()}`;
}

function formatPrice(p) { const n = parsePrice(p); return n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, {minimumFractionDigits:1}); }
function parsePrice(p) { return parseFloat(String(p).replace(/[$\s]/g, '').replace(',', '.')) || 0; }
function filterBy(c, d) { renderProducts(c === 'all' ? products : products.filter(p => p.cat === c && p.dept === d)); }
function toggleCart(s) { document.getElementById('cartSidebar').classList.toggle('active', s); }
function toggleModal(s) { document.getElementById('checkoutModal').style.display = s ? 'block' : 'none'; document.getElementById('modalOverlay').style.display = s ? 'block' : 'none'; }
function toggleAdminPanel(s) { adminPanel.style.display = s ? 'block' : 'none'; document.getElementById('modalOverlay').style.display = s ? 'block' : 'none'; if(s) renderAdminProducts(); }
function toggleLoginModal(s) { loginModal.style.display = s ? 'block' : 'none'; document.getElementById('modalOverlay').style.display = s ? 'block' : 'none'; if(s) adminPassInput.focus(); }
function handleLogin() { if (adminPassInput.value === ADMIN_PASS) { toggleLoginModal(false); toggleAdminPanel(true); } else alert("Clave incorrecta"); adminPassInput.value = ''; }
function handleOrder() {
    const n = document.getElementById('custName').value, ph = document.getElementById('custPhone').value, ad = document.getElementById('custAddr').value;
    const msg = `PEDIDO: ${cart.map(i => i.name + ' x' + i.quantity).join(', ')}`;
    window.open(`https://wa.me/${businessPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    cart = []; updateCartUI(); toggleModal(false);
}
function toggleSubmenu(e) { e.preventDefault(); e.target.nextElementSibling.classList.toggle('active'); }
function handleHeaderScroll() { const h = document.getElementById('header'); if (window.scrollY > 50) h.style.background = 'rgba(2,6,23,0.95)'; else h.style.background = 'rgba(30,41,59,0.7)'; }
