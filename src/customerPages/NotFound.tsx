import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="font-heading text-6xl md:text-8xl font-bold text-accent mb-4">
        404
      </h1>
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
        الصفحة غير موجودة
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        نأسف، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <Button asChild size="lg" className="gold-gradient border-0 text-foreground font-bold">
        <Link to="/">العودة للصفحة الرئيسية</Link>
      </Button>
    </div>
  );
}
