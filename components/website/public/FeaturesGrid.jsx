import React from 'react';
import { BookOpen, Users, Award, ShieldCheck, Zap, Globe } from 'lucide-react';

const iconMap = {
    'book': BookOpen,
    'users': Users,
    'award': Award,
    'shield': ShieldCheck,
    'zap': Zap,
    'globe': Globe
};

const FeaturesGrid = ({ content = {}, isEditing = false, onUpdate }) => {
    const {
        title = "Why Choose Us?",
        subtitle = "Experience excellence in education with our modern facilities and expert faculty.",
        features = [
            { id: 1, title: "Expert Faculty", desc: "Learn from industry professionals and experienced teachers.", icon: 'users' },
            { id: 2, title: "Modern Facilities", desc: "State-of-the-art labs and classrooms for hands-on learning.", icon: 'zap' },
            { id: 3, title: "Global Recognition", desc: "Certificates and degrees recognized worldwide.", icon: 'globe' }
        ]
    } = content;

    return (
        <section className="py-20 bg-slate-50">
            <div className="container px-6 mx-auto">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                        {isEditing ? (
                            <input 
                                className="bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none w-full text-center"
                                value={title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                            />
                        ) : title}
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        {isEditing ? (
                            <textarea 
                                className="bg-transparent border border-slate-200 rounded p-2 w-full h-20 focus:border-blue-500 outline-none text-center"
                                value={subtitle}
                                onChange={(e) => onUpdate({ subtitle: e.target.value })}
                            />
                        ) : subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {features.map((feature, index) => {
                        const IconComponent = iconMap[feature.icon] || BookOpen;
                        return (
                            <div key={feature.id} className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl mb-6">
                                    <IconComponent size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">
                                    {isEditing ? (
                                        <input 
                                            className="bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none w-full"
                                            value={feature.title}
                                            onChange={(e) => {
                                                const newFeatures = [...features];
                                                newFeatures[index].title = e.target.value;
                                                onUpdate({ features: newFeatures });
                                            }}
                                        />
                                    ) : feature.title}
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    {isEditing ? (
                                        <textarea 
                                            className="bg-transparent border border-slate-100 rounded p-1 w-full h-20 focus:border-blue-500 outline-none text-sm"
                                            value={feature.desc}
                                            onChange={(e) => {
                                                const newFeatures = [...features];
                                                newFeatures[index].desc = e.target.value;
                                                onUpdate({ features: newFeatures });
                                            }}
                                        />
                                    ) : feature.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FeaturesGrid;
