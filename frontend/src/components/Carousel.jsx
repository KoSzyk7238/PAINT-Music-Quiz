import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Carousel({ title, icon: Icon, children }) {
    const carouselRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggingMove, setIsDraggingMove] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const checkScroll = () => {
        if (carouselRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
            setShowLeftArrow(scrollLeft > 5);
            setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
        }
    };

    useEffect(() => {
        // Initial check and on children change
        setTimeout(checkScroll, 100);
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [children]);

    const scroll = (direction) => {
        if (carouselRef.current) {
            const { clientWidth } = carouselRef.current;
            const scrollAmount = clientWidth * 0.75; // Scroll by 75% of the visible width
            carouselRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 350);
        }
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setIsDraggingMove(false);
        setStartX(e.pageX - carouselRef.current.offsetLeft);
        setScrollLeft(carouselRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        setIsDraggingMove(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Do not reset isDraggingMove immediately, so onClickCapture can catch it
        setTimeout(() => setIsDraggingMove(false), 50);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const x = e.pageX - carouselRef.current.offsetLeft;
        const walk = (x - startX); 
        
        if (Math.abs(walk) > 5) {
            setIsDraggingMove(true);
        }
        
        if (isDraggingMove) {
            e.preventDefault();
            carouselRef.current.scrollLeft = scrollLeft - walk * 1.5; // multiplier
        }
    };

    if (!children || children.length === 0) return null;

    return (
        <div className="flex flex-col gap-4 group/carousel relative mb-12">
            {(title || Icon) && (
                <div className="flex items-center gap-2 px-4 sm:px-0">
                    {Icon && <Icon className="text-green-400" size={24} fill="currentColor" />}
                    {title && <h3 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-wide drop-shadow-md">{title}</h3>}
                </div>
            )}
            
            <div className="relative w-full">
                {showLeftArrow && (
                    <button 
                        type="button"
                        onClick={() => scroll('left')}
                        aria-label={`Przewiń sekcję ${title || 'quizów'} w lewo`}
                        className="absolute left-0 sm:-left-5 top-1/2 -translate-y-1/2 z-30 bg-gray-950/90 hover:bg-green-500 hover:text-black border border-white/10 hover:border-green-500 text-white p-3 sm:p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300 hover:scale-110 active:scale-95 opacity-0 group-hover/carousel:opacity-100 hidden md:block"
                        title="Przewiń w lewo"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}
                
                <div 
                    ref={carouselRef}
                    onScroll={checkScroll}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar items-stretch w-full px-4 sm:px-0 -my-6 scroll-smooth ${!isDraggingMove ? 'snap-x snap-mandatory' : ''}`}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                    {React.Children.map(children, child => (
                        <div 
                            className="snap-start shrink-0 w-72 sm:w-80 relative hover:z-20 transition-all duration-300 pt-6 pb-6"
                            onClickCapture={(e) => {
                                if (isDraggingMove) {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }
                            }}
                        >
                            {child}
                        </div>
                    ))}
                </div>

                {showRightArrow && (
                    <button 
                        type="button"
                        onClick={() => scroll('right')}
                        aria-label={`Przewiń sekcję ${title || 'quizów'} w prawo`}
                        className="absolute right-0 sm:-right-5 top-1/2 -translate-y-1/2 z-30 bg-gray-950/90 hover:bg-green-500 hover:text-black border border-white/10 hover:border-green-500 text-white p-3 sm:p-4 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300 hover:scale-110 active:scale-95 opacity-0 group-hover/carousel:opacity-100 hidden md:block"
                        title="Przewiń w prawo"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
                
                {/* Fade edges on desktop */}
                {showLeftArrow && <div className="absolute top-0 bottom-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none hidden sm:block z-10" />}
                {showRightArrow && <div className="absolute top-0 bottom-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-black via-black/80 to-transparent pointer-events-none hidden sm:block z-10" />}
            </div>
        </div>
    );
}
