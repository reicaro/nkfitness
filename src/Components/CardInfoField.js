const CardInfoField = ({ nValueDefinition, kValueDefinition }) => {
    return (
      <div className="flex-1 flex flex-col items-start justify-start gap-[8px] text-left text-sm text-gray-700 font-inter">
        <div className="self-stretch relative tracking-[-0.1px] leading-[20px] font-medium">
          {nValueDefinition}
        </div>
        <input
          className="font-inter text-mini bg-base-white self-stretch rounded-md shadow-[0px_1px_2px_rgba(16,_24,_40,_0.04)] box-border h-[46px] overflow-hidden shrink-0 flex flex-row py-3 px-4 items-center justify-start border-[1px] border-solid border-neutral-700"
          type="text"
          placeholder={kValueDefinition}
          required
        />
        <div className="self-stretch relative tracking-[-0.1px] leading-[20px] text-gray-50 hidden">
          Hint text
        </div>
      </div>
    );
  };
  
  export default CardInfoField;
  