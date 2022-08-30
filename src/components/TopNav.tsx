import React from 'react';
import Link from 'next/link';

interface Props {
}

const TopNav: React.FC<Props> = (props: Props) => {
  return (
    <nav {...props} className="space-x-1 p-2 bg-slate-300">
      <Link href="/">
        <span className="pill">Hem</span>
      </Link>
      <Link href="/valsedel">
        <span className="pill">Valsedel</span>
      </Link>
    </nav>
  );
};

export default TopNav;
