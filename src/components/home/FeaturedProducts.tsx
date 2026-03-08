'use client'

import Link from 'next/link'
import { Shirt, Coffee, Frame, ShoppingBag } from 'lucide-react'

const featured = [
    { name: 'Unisex T-Shirt', price: '$29.99', icon: Shirt, gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Premium Hoodie', price: '$59.99', icon: Shirt, gradient: 'from-purple-500 to-pink-500' },
    { name: 'White Mug 11oz', price: '$18.99', icon: Coffee, gradient: 'from-orange-500 to-red-500' },
    { name: 'Canvas Print', price: '$39.99', icon: Frame, gradient: 'from-green-500 to-emerald-500' },
    { name: 'Tote Bag', price: '$22.99', icon: ShoppingBag, gradient: 'from-yellow-500 to-orange-500' },
    { name: 'Sticker Sheet', price: '$12.99', icon: Frame, gradient: 'from-pink-500 to-rose-500' },
]

export default function FeaturedProducts() {
    return (
        <section className="py-24">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Print On <span className="text-gradient">Anything</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Your AI-generated designs on premium, high-quality products
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {featured.map((product) => (
                        <Link
                            key={product.name}
                            href="/create"
                            className="glass rounded-2xl p-6 hover:border-purple-500/20 transition-all duration-300 hover:-translate-y-1 group"
                        >
                            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${product.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <product.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="font-semibold mb-1">{product.name}</h3>
                            <p className="text-sm text-purple-400 font-medium">from {product.price}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
