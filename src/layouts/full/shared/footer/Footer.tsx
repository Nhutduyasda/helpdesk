import { Link } from "react-router";
import { useLocation } from 'react-router';


type SearchType = {
    title: string;
    href: string;
};

const searchSugg: SearchType[] = [
    { title: "Support", href: "https://shadcndashboard.dev/support" },
    { title: "License", href: "https://shadcndashboard.dev/license" },
];

export default function Footer() {
    const care = useLocation().pathname.startsWith('/it');
    if (care) return <p className="text-xs text-muted-foreground text-center">ITCare · Bản mẫu giao diện · <a href="https://shadcndashboard.dev/" className="underline">Shadcn Dashboard</a></p>;
    return (
        <div className="flex md:flex-row flex-col items-center justify-between gap-3 text-center">
            <p className="text-sm text-muted-foreground">
                © 2026 by{" "}
                <Link
                    to="https://www.wrappixel.com/" target="_blank"
                    className="hover:text-primary text-muted-foreground"
                >
                    shadcndashboard
                </Link>
                , creating a better web for you.
            </p>

            <div className="flex gap-4">
                {searchSugg.map((item, index) => (
                    <Link
                        key={index}
                        target="_blank"
                        to={item.href}
                        className="text-sm hover:text-primary text-muted-foreground"
                    >
                        {item.title}
                    </Link>
                ))}
            </div>
        </div>
    );
}
