// Configuration publique uniquement.
// Ne mets JAMAIS une clé secrète Stripe ici.
// Pour Stripe Pricing Table, tu peux renseigner l'ID de ta table.
// Pour une vraie application, crée Checkout côté serveur avec ta clé secrète.
// Exemple : const LUCIDE_STRIPE = { pricingTableId: "prctbl_..." };
const LUCIDE_STRIPE = {
  pricingTableId: "",
  proPriceId: "https://buy.stripe.com/test_cNi00i9he9Sl5DRdda0gw00",
  premiumPriceId: "https://buy.stripe.com/test_eVq6oGbpme8Bean1us0gw01",
  customerPortalUrl: ""
};
