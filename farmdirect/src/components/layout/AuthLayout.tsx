import { Outlet } from "react-router-dom";
import Logo from "../ui/Logo";

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1400&q=80"
          alt="Sunlit farm field"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
        <div className="relative z-10 mt-auto p-12 text-on-primary">
          <h2 className="font-display text-headline-lg mb-3">From Farmer. Direct to You.</h2>
          <p className="font-body text-body-lg opacity-90 max-w-md">
            Join thousands of customers and farmers building a more transparent, local food system.
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-margin-mobile py-12">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Logo size={36} />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
