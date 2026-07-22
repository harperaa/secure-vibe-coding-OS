import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

type Testimonial = {
    name: string
    role: string
    image: string
    quote: string
}

const testimonials: Testimonial[] = [
    {
        name: 'Jonathan Yombo',
        role: 'Software Engineer',
        image: 'https://randomuser.me/api/portraits/men/1.jpg',
        quote: 'Tailus is really extraordinary and very practical, no need to break your head. A real gold mine.',
    },
    {
        name: 'Yves Kalume',
        role: 'GDE - Android',
        image: 'https://randomuser.me/api/portraits/men/6.jpg',
        quote: 'With no experience in webdesign I just redesigned my entire website in a few minutes with tailwindcss thanks to Tailus.',
    },
    {
        name: 'Yucel Faruksahan',
        role: 'Tailkits Creator',
        image: 'https://randomuser.me/api/portraits/men/7.jpg',
        quote: 'Great work on tailfolio template. This is one of the best personal website that I have seen so far :)',
    },
    {
        name: 'Shekinah Tshiokufila',
        role: 'Senior Software Engineer',
        image: 'https://randomuser.me/api/portraits/men/4.jpg',
        quote: 'Tailus is redefining the standard of web design, with these blocks it provides an easy and efficient way for those who love beauty but may lack the time to implement it. I can only recommend this incredible wonder.',
    },
    {
        name: 'Oketa Fred',
        role: 'Fullstack Developer',
        image: 'https://randomuser.me/api/portraits/men/2.jpg',
        quote: 'I absolutely love Tailus! The component blocks are beautifully designed and easy to use, which makes creating a great-looking website a breeze.',
    },
    {
        name: 'Yves Kalume',
        role: 'GDE - Android',
        image: 'https://randomuser.me/api/portraits/men/6.jpg',
        quote: 'With no experience in webdesign I just redesigned my entire website in a few minutes with tailwindcss thanks to Tailus.',
    },
]

const chunkArray = (array: Testimonial[], chunkSize: number): Testimonial[][] => {
    const result: Testimonial[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize))
    }
    return result
}

const testimonialChunks = chunkArray(testimonials, Math.ceil(testimonials.length / 3))

export default function WallOfLoveSection() {
    return (
        <section>
            <div className="py-16 md:py-32">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-foreground text-4xl font-semibold">Loved by the Community</h2>
                        <p className="text-muted-foreground mb-12 mt-4 text-balance text-lg">Harum quae dolore orrupti aut temporibus ariatur.</p>
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
                        {testimonialChunks.map((chunk, chunkIndex) => (
                            <div
                                key={chunkIndex}
                                className="space-y-3">
                                {chunk.map(({ name, role, quote, image }, index) => (
                                    <Card key={index}>
                                        <CardContent className="grid grid-cols-[auto_1fr] gap-3 pt-6">
                                            <Avatar className="size-9">
                                                <AvatarImage
                                                    alt={name}
                                                    src={image}
                                                    loading="lazy"
                                                    width="120"
                                                    height="120"
                                                />
                                                <AvatarFallback>ST</AvatarFallback>
                                            </Avatar>

                                            <div>
                                                <h3 className="font-medium">{name}</h3>

                                                <span className="text-muted-foreground block text-sm tracking-wide">{role}</span>

                                                <blockquote className="mt-3">
                                                    <p className="text-gray-700 dark:text-gray-300">{quote}</p>
                                                </blockquote>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
