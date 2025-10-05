"use client"

export default function LeftSide() {
  return (
    <div
      className="leftside w-full h-1/2 md:w-2/5 md:h-screen flex flex-col items-center justify-center p-4 md:p-8 text-white relative"
      style={{
        background: "linear-gradient(180deg, #3A89FF 0%, #6BBBFF 100%)",
        fontFamily: "'Montagu Slab', serif",
      }}
    >
      <img
        src="/cpclogo.png"
        alt="Cordova Public College Logo"
        className="w-32 h-32 mb-4 sm:w-52 sm:h-52 md:mb-10 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-96 xl:h-96 xl:-mt-30  rounded-full shadow-lg"
      />
      <h1 className="text-2xl font-bold text-center mb-1 tracking-wide whitespace-nowrap md:text-3xl md:mb-2 xl:text-5xl">
        ELECTION WEBSITE
      </h1>
      <p className="text-base text-center font-light md:text-lg xl:text-3xl">VOTE FOR A CHANGE</p>
    </div>
  )
}
