'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { safeLogout } from '../utils/auth';

export default function Menu({ 
    isOpen = false, 
    onClose = null
}) {
    const pathname = usePathname();

    const menuItems = [
        { href: '/homegame', icon: '/img/Vector-16.png', label: '首頁' },
        { href: '/note', icon: '/img/Vector-15.png', label: '筆記' },
        { href: '/user', icon: '/img/Vector-33.png', label: '使用者' }
    ];

    return (
        <>
            {/* 選單背景 */}
            <div 
                className={`menu-backdrop ${isOpen ? 'active' : ''}`} 
                onClick={onClose}
            ></div>

            {/* 選單下拉 */}
            <div className={`menu-dropdown ${isOpen ? 'active' : ''}`}>
                <div className="menu-header"></div>

                {menuItems.map(item => (
                    <Link 
                        key={item.href} 
                        href={item.href} 
                        className={`menu-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <Image src={item.icon} alt="" className="menu-item-icon" width={24} height={24} />
                        <span>{item.label}</span>
                    </Link>
                ))}

                <button 
                    className="menu-item logout-button" 
                    onClick={safeLogout}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <Image src="/img/Vector-30.png" alt="" className="menu-item-icon" width={24} height={24} />
                    <span>登出</span>
                </button>
            </div>
        </>
    );
}
