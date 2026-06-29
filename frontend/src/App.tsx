import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Fanzine from "./pages/Fanzine";
import Library from "./pages/Library";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Login from "./pages/Login";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/produits" element={<Products />} />
        <Route path="/produits/:slug" element={<ProductDetail />} />
        <Route path="/panier" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/fanzine" element={<Fanzine />} />
        <Route path="/bibliotheque" element={<Library />} />
        <Route path="/commandes" element={<Orders />} />
        <Route path="/profil" element={<Profile />} />
      </Route>
    </Routes>
  );
}
