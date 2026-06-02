import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/adminFunctions/auth";
import { ProductsProvider } from "@/adminFunctions/products";
import { BatchesProvider } from "@/adminFunctions/batches";
import { SuppliersProvider } from "@/adminFunctions/suppliers";
import { CustomersProvider } from "@/adminFunctions/customers";
import { PurchasesProvider } from "@/adminFunctions/purchases";
import { TransactionsProvider } from "@/adminFunctions/transactions";
import { OrdersProvider } from "@/adminFunctions/orders";
import { CartProvider } from "@/customerFunctions/cart";
import { StoreSettingsProvider } from "@/adminFunctions/storeSettings";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreSettingsProvider>
        <AuthProvider>
          <TooltipProvider>
            <ProductsProvider>
              <BatchesProvider>
                <SuppliersProvider>
                  <CustomersProvider>
                    <PurchasesProvider>
                      <TransactionsProvider>
                        <OrdersProvider>
                          <CartProvider>
                            <Sonner />
                            {children}
                          </CartProvider>
                        </OrdersProvider>
                      </TransactionsProvider>
                    </PurchasesProvider>
                  </CustomersProvider>
                </SuppliersProvider>
              </BatchesProvider>
            </ProductsProvider>
          </TooltipProvider>
        </AuthProvider>
      </StoreSettingsProvider>
    </QueryClientProvider>
  );
}
