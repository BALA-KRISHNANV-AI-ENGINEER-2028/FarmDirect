import Logo from "../ui/Logo";

export default function Footer() {
  return (
    <footer className="bg-surface-container border-t border-outline-variant w-full mt-auto">
      <div className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <Logo size={28} />
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <a className="text-label-sm text-on-surface-variant hover:text-tertiary underline transition-all" href="#">
            Harvest Updates
          </a>
          <a className="text-label-sm text-on-surface-variant hover:text-tertiary underline transition-all" href="#">
            Community Impact
          </a>
          <a className="text-label-sm text-on-surface-variant hover:text-tertiary underline transition-all" href="#">
            Privacy Policy
          </a>
          <a className="text-label-sm text-on-surface-variant hover:text-tertiary underline transition-all" href="#">
            Terms of Service
          </a>
        </div>
        <div className="text-body-md text-on-surface-variant text-center md:text-right opacity-80">
          © 2026 FarmDirect. Cultivating Community Through Digital Stewardship.
        </div>
      </div>
    </footer>
  );
}
